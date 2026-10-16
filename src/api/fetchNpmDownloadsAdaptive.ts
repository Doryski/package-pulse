import { formatDate, parseDate } from "@/app/(home)/utils/date-utils";
import {
  NPM_API_FIRST_DAY,
  NPM_BULK_RANGE_API_PERIOD_DAYS,
  NPM_RANGE_API_PERIOD_MONTHS,
} from "@/lib/config/constants";
import { NPMDownloadCount } from "@/lib/schemas/npmDownloadsPeriod.schema";
import { normalizeRangeResponse } from "@/lib/schemas/npmBulkDownloads.schema";
import AppError from "@/lib/utils/AppError";
import getTimePeriods from "@/lib/utils/getTimePeriods";
import partitionPackages from "@/lib/utils/partitionPackages";
import {
  adaptiveMap,
  ConcurrencyConfig,
  RateLimitError,
  RetryConfig,
} from "adaptive-promise-pool";
import { isValid, startOfDay } from "date-fns";
import { toZonedTime } from "date-fns-tz";

const NPM_RANGE_BASE_URL = "https://api.npmjs.org/downloads/range";

const DEFAULT_CONCURRENCY: ConcurrencyConfig = { initial: 4, min: 1, max: 8 };
const DEFAULT_RETRY: RetryConfig = {
  retries: 3,
  backoff: "exponential",
  jitter: true,
  minDelay: 200,
  maxRateLimitRetries: 4,
  maxRetryAfter: 60_000,
};

export type AdaptiveDownloadsResult = {
  data: Record<string, NPMDownloadCount[] | null>;
  errors: Record<string, string>;
  stats: {
    requestCount: number;
    rateLimitEvents: number;
    totalRetries: number;
    maxConcurrencyReached: number;
    finalConcurrency: number;
  };
};

type FetchNpmDownloadsAdaptiveOptions = {
  startDate?: Date;
  fetchImpl?: typeof fetch;
  concurrency?: ConcurrencyConfig;
  retry?: RetryConfig;
  signal?: AbortSignal;
};

type DownloadTask = { url: string; packages: string[] };

type NormalizedMap = ReturnType<typeof normalizeRangeResponse>;
type TaskSuccess = { packages: string[]; map: NormalizedMap };
type TaskFailure = { packages: string[]; error: string; notFound?: boolean };
type TaskResult = TaskSuccess | TaskFailure;

const isTaskFailure = (result: TaskResult): result is TaskFailure =>
  "error" in result;

export const notFoundMessage = (name: string) => `Package "${name}" not found`;
const failedMessage = (name: string) =>
  `Failed to load downloads for "${name}"`;
const partialMessage = (name: string) =>
  `Some download data for "${name}" could not be loaded`;

const isNotFoundErrorBody = (message: string) => {
  const normalized = message.toLowerCase();
  return normalized.includes("not found") || normalized.includes("no stats");
};

const buildRangeUrl = (start: Date, end: Date, packages: string) =>
  `${NPM_RANGE_BASE_URL}/${formatDate(start)}:${formatDate(end)}/${packages}`;

function buildTasks(packages: string[], from: Date, to: Date): DownloadTask[] {
  const { unscoped, scoped } = partitionPackages(packages);
  const tasks: DownloadTask[] = [];

  if (unscoped.length > 0) {
    const joined = unscoped.join(",");
    const windows = getTimePeriods(
      from,
      to,
      NPM_BULK_RANGE_API_PERIOD_DAYS,
      "days",
    );
    for (const window of windows) {
      tasks.push({
        url: buildRangeUrl(window.start, window.end, joined),
        packages: unscoped,
      });
    }
  }

  for (const pkg of scoped) {
    const windows = getTimePeriods(
      from,
      to,
      NPM_RANGE_API_PERIOD_MONTHS,
      "months",
    );
    for (const window of windows) {
      tasks.push({
        url: buildRangeUrl(window.start, window.end, pkg),
        packages: [pkg],
      });
    }
  }

  return tasks;
}

function mergeDownloads(downloads: NPMDownloadCount[]): NPMDownloadCount[] {
  const byDate = new Map<string, NPMDownloadCount>();
  for (const entry of downloads) {
    byDate.set(entry.date, entry);
  }
  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}

type PackageAccumulator = {
  downloads: NPMDownloadCount[];
  sawData: boolean;
  notFoundWindows: number;
  failedWindows: number;
};

type ResolvedPackage = {
  downloads: NPMDownloadCount[] | null;
  error?: string;
};

const createAccumulator = (): PackageAccumulator => ({
  downloads: [],
  sawData: false,
  notFoundWindows: 0,
  failedWindows: 0,
});

function resolvePackage(
  name: string,
  acc: PackageAccumulator,
): ResolvedPackage {
  if (acc.sawData && acc.failedWindows > 0) {
    return {
      downloads: mergeDownloads(acc.downloads),
      error: partialMessage(name),
    };
  }
  if (acc.sawData) return { downloads: mergeDownloads(acc.downloads) };
  if (acc.failedWindows > 0) {
    return { downloads: null, error: failedMessage(name) };
  }
  if (acc.notFoundWindows > 0) {
    return { downloads: null, error: notFoundMessage(name) };
  }
  return { downloads: null };
}

export default async function fetchNpmDownloadsAdaptive(
  packages: string[],
  opts?: FetchNpmDownloadsAdaptiveOptions,
): Promise<AdaptiveDownloadsResult> {
  const fetchImpl = opts?.fetchImpl ?? fetch;

  let from = parseDate(NPM_API_FIRST_DAY);
  if (opts?.startDate && isValid(opts.startDate)) {
    from = opts.startDate;
  }
  const today = startOfDay(toZonedTime(new Date(), "UTC"));

  const tasks = buildTasks(packages, from, today);

  const processor = async (
    task: DownloadTask,
    ctx: { signal: AbortSignal },
  ): Promise<TaskResult> => {
    const res = await fetchImpl(task.url, { signal: ctx.signal });

    if (res.status === 429) {
      throw new RateLimitError({
        retryAfter: Number(res.headers.get("retry-after")) || undefined,
      });
    }
    if (res.status === 404) {
      return { packages: task.packages, error: "not found", notFound: true };
    }
    if (res.status >= 400 && res.status < 500) {
      return {
        packages: task.packages,
        error: `NPM API responded with status ${res.status}`,
      };
    }
    if (!res.ok) {
      throw new Error(`NPM API responded with status ${res.status}`);
    }

    try {
      const map = normalizeRangeResponse(await res.json());
      return { packages: task.packages, map };
    } catch (error) {
      if (error instanceof AppError && isNotFoundErrorBody(error.message)) {
        return {
          packages: task.packages,
          error: error.message,
          notFound: true,
        };
      }
      throw error;
    }
  };

  const result = await adaptiveMap(tasks, processor, {
    concurrency: opts?.concurrency ?? DEFAULT_CONCURRENCY,
    adaptOn: { latency: true, errors: true, rateLimit: true },
    retry: opts?.retry ?? DEFAULT_RETRY,
    signal: opts?.signal,
  });

  const accumulators = new Map(
    packages.map((name) => [name, createAccumulator()] as const),
  );
  const update = (names: string[], apply: (acc: PackageAccumulator) => void) =>
    names
      .map((name) => accumulators.get(name))
      .filter((acc) => acc !== undefined)
      .forEach(apply);

  for (const outcome of result.results) {
    if (isTaskFailure(outcome)) {
      update(outcome.packages, (acc) => {
        if (outcome.notFound) acc.notFoundWindows += 1;
        else acc.failedWindows += 1;
      });
      continue;
    }
    for (const [name, period] of Object.entries(outcome.map)) {
      if (!period) continue;
      update([name], (acc) => {
        acc.downloads.push(...period.downloads);
        acc.sawData = true;
      });
    }
  }

  for (const failed of result.errors) {
    update(failed.item.packages, (acc) => {
      acc.failedWindows += 1;
    });
  }

  const resolved = [...accumulators].map(
    ([name, acc]) => [name, resolvePackage(name, acc)] as const,
  );
  const data = Object.fromEntries(
    resolved.map(([name, { downloads }]) => [name, downloads]),
  );
  const errors = Object.fromEntries(
    resolved.flatMap(([name, { error }]) =>
      error ? [[name, error] as const] : [],
    ),
  );
  const hasNonNotFoundFailure = [...accumulators.values()].some(
    (acc) => acc.failedWindows > 0,
  );

  const hasAnyData = Object.values(data).some((value) => value !== null);
  if (!hasAnyData && hasNonNotFoundFailure) {
    const firstError = result.errors[0]?.error;
    throw firstError instanceof AppError
      ? firstError
      : new AppError("Failed to fetch NPM download data");
  }

  return {
    data,
    errors,
    stats: {
      requestCount: tasks.length,
      rateLimitEvents: result.stats.rateLimitEvents,
      totalRetries: result.stats.totalRetries,
      maxConcurrencyReached: result.stats.maxConcurrencyReached,
      finalConcurrency: result.stats.finalConcurrency,
    },
  };
}
