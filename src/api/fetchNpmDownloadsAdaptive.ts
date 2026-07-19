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
  ) => {
    const res = await fetchImpl(task.url, { signal: ctx.signal });

    if (res.status === 429) {
      throw new RateLimitError({
        retryAfter: Number(res.headers.get("retry-after")) || undefined,
      });
    }
    if (!res.ok) {
      throw new Error(`NPM API responded with status ${res.status}`);
    }

    const map = normalizeRangeResponse(await res.json());
    return { packages: task.packages, map };
  };

  const result = await adaptiveMap(tasks, processor, {
    concurrency: opts?.concurrency ?? DEFAULT_CONCURRENCY,
    adaptOn: { latency: true, errors: true, rateLimit: true },
    retry: opts?.retry ?? DEFAULT_RETRY,
    signal: opts?.signal,
  });

  const firstError = result.errors[0];
  if (firstError) {
    throw firstError.error instanceof AppError
      ? firstError.error
      : new AppError("Failed to fetch NPM download data");
  }

  const accumulator = new Map<
    string,
    { downloads: NPMDownloadCount[]; sawNonNull: boolean }
  >();
  for (const name of packages) {
    accumulator.set(name, { downloads: [], sawNonNull: false });
  }

  for (const { map } of result.results) {
    for (const [name, period] of Object.entries(map)) {
      const acc = accumulator.get(name);
      if (!acc || !period) continue;
      acc.downloads.push(...period.downloads);
      acc.sawNonNull = true;
    }
  }

  const data: Record<string, NPMDownloadCount[] | null> = {};
  for (const [name, acc] of accumulator) {
    data[name] = acc.sawNonNull ? mergeDownloads(acc.downloads) : null;
  }

  return {
    data,
    stats: {
      requestCount: tasks.length,
      rateLimitEvents: result.stats.rateLimitEvents,
      totalRetries: result.stats.totalRetries,
      maxConcurrencyReached: result.stats.maxConcurrencyReached,
      finalConcurrency: result.stats.finalConcurrency,
    },
  };
}
