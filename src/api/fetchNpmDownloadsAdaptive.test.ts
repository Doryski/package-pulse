/**
 * @vitest-environment node
 */
import { formatDate, parseDate } from "@/app/(home)/utils/date-utils";
import fetchNpmDownloadsAdaptive, {
  CLOSED_WINDOW_REVALIDATE_SECONDS,
  hasTransientErrors,
  notFoundMessage,
  parsePackageList,
} from "@/api/fetchNpmDownloadsAdaptive";
import {
  NPM_BULK_RANGE_API_PERIOD_DAYS,
  NPM_API_FIRST_DAY,
  NPM_RANGE_API_PERIOD_MONTHS,
  SELECTED_PROJECTS_LIMIT,
} from "@/lib/config/constants";
import getTimePeriods from "@/lib/utils/getTimePeriods";
import { RetryConfig } from "adaptive-promise-pool";
import { eachDayOfInterval, startOfDay, sub } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

const FIRST_DAY = parseDate(NPM_API_FIRST_DAY);
const SYSTEM_TIME = new Date("2024-03-15T10:30:00.000Z");
const RANGE_BASE_URL = "https://api.npmjs.org/downloads/range";

const FAST_RETRY: RetryConfig = {
  retries: 3,
  backoff: "constant",
  jitter: false,
  minDelay: 1,
  maxRateLimitRetries: 4,
  maxRetryAfter: 50,
};

type RawDownload = { day: string; downloads: number };

const makeResponse = (
  status: number,
  body?: unknown,
  headers: Record<string, string> = {},
) =>
  ({
    status,
    ok: status >= 200 && status < 300,
    headers: {
      get: (name: string) => headers[name.toLowerCase()] ?? null,
    },
    json: async () => body,
  }) as unknown as Response;

const flatBody = (pkg: string, downloads: RawDownload[]) => ({
  package: pkg,
  start: "2015-01-10",
  end: "2024-03-15",
  downloads,
});

const bulkBody = (entries: Record<string, RawDownload[]>) =>
  Object.fromEntries(
    Object.entries(entries).map(([pkg, downloads]) => [
      pkg,
      { package: pkg, start: "2015-01-10", end: "2024-03-15", downloads },
    ]),
  );

const rangeOf = (url: string) => url.split("/range/")[1]!.split("/")[0]!;
const startOf = (url: string) => rangeOf(url).split(":")[0]!;

const buildUrl = (start: Date, end: Date, pkgs: string) =>
  `${RANGE_BASE_URL}/${formatDate(start)}:${formatDate(end)}/${pkgs}`;

const getToday = () => startOfDay(toZonedTime(new Date(), "UTC"));

const asFetch = (fn: unknown) => fn as unknown as typeof fetch;

const daysAgo = (days: number) => sub(getToday(), { days });

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(SYSTEM_TIME);
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("fetchNpmDownloadsAdaptive - window building", () => {
  test("partitions unscoped into day windows and scoped into month windows", async () => {
    const today = getToday();
    const startDate = daysAgo(400);
    const fetchImpl = vi.fn((url: string) => {
      const isScoped = url.includes("@scope/a");
      const body = isScoped
        ? flatBody("@scope/a", [{ day: "2024-01-01", downloads: 1 }])
        : bulkBody({
            react: [{ day: "2024-01-01", downloads: 1 }],
            vue: [{ day: "2024-01-01", downloads: 1 }],
          });
      return Promise.resolve(makeResponse(200, body));
    });

    const result = await fetchNpmDownloadsAdaptive(
      ["react", "vue", "@scope/a"],
      { startDate, fetchImpl: asFetch(fetchImpl), retry: FAST_RETRY },
    );

    const dayWindows = getTimePeriods(
      startDate,
      today,
      NPM_BULK_RANGE_API_PERIOD_DAYS,
      "days",
      FIRST_DAY,
    );
    const monthWindows = getTimePeriods(
      startDate,
      today,
      NPM_RANGE_API_PERIOD_MONTHS,
      "months",
      FIRST_DAY,
    );

    const expectedUrls = [
      ...dayWindows.map((w) => buildUrl(w.start, w.end, "react,vue")),
      ...monthWindows.map((w) => buildUrl(w.start, w.end, "@scope/a")),
    ];

    const calledUrls = fetchImpl.mock.calls.map((call) => call[0]!);

    expect(dayWindows).toHaveLength(2);
    expect(monthWindows).toHaveLength(2);
    expect(fetchImpl).toHaveBeenCalledTimes(4);
    expect([...calledUrls].sort()).toEqual([...expectedUrls].sort());
    expect(result.stats.requestCount).toBe(4);

    const joinedRequests = calledUrls.filter((url) =>
      url.includes("react,vue"),
    );
    const scopedRequests = calledUrls.filter((url) => url.includes("@scope/a"));
    expect(joinedRequests).toHaveLength(2);
    expect(scopedRequests).toHaveLength(2);
    expect(scopedRequests[0]!.includes(",")).toBe(false);
  });
});

describe("fetchNpmDownloadsAdaptive - dispatch order", () => {
  test("requests the newest windows first so rate limits cost the oldest history", async () => {
    const fetchImpl = vi.fn((_url: string) =>
      Promise.resolve(
        makeResponse(
          200,
          bulkBody({ react: [{ day: "2024-01-01", downloads: 1 }] }),
        ),
      ),
    );

    await fetchNpmDownloadsAdaptive(["react"], {
      startDate: daysAgo(800),
      fetchImpl: asFetch(fetchImpl),
      retry: FAST_RETRY,
      concurrency: { initial: 1, min: 1, max: 1 },
    });

    const starts = fetchImpl.mock.calls.map((call) => startOf(call[0]!));
    expect(starts.length).toBeGreaterThan(1);
    expect(starts).toEqual([...starts].sort().reverse());
  });
});

describe("fetchNpmDownloadsAdaptive - merge & happy path", () => {
  test("returns merged, sorted data with no error entry for a valid package", async () => {
    const fetchImpl = vi.fn(() =>
      Promise.resolve(
        makeResponse(
          200,
          flatBody("react", [
            { day: "2024-01-02", downloads: 150 },
            { day: "2024-01-01", downloads: 100 },
          ]),
        ),
      ),
    );

    const result = await fetchNpmDownloadsAdaptive(["react"], {
      startDate: daysAgo(30),
      fetchImpl: asFetch(fetchImpl),
      retry: FAST_RETRY,
    });

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(result.stats.requestCount).toBe(1);
    expect(result.data.react).toEqual([
      { date: "2024-01-01", count: 100 },
      { date: "2024-01-02", count: 150 },
    ]);
    expect(result.errors).toEqual({});
    expect(result.errors.react).toBeUndefined();
  });

  test("de-dupes the shared boundary date between adjacent windows and sorts output", async () => {
    const today = getToday();
    const startDate = daysAgo(400);
    const windows = getTimePeriods(
      startDate,
      today,
      NPM_BULK_RANGE_API_PERIOD_DAYS,
      "days",
      FIRST_DAY,
    );
    const recent = windows.at(-1)!;
    const older = windows.at(-2)!;
    const boundary = formatDate(recent.start);
    const oldest = formatDate(older.start);
    const newest = formatDate(recent.end);

    const fetchImpl = vi.fn((url: string) => {
      const isRecent = startOf(url) === formatDate(recent.start);
      const downloads = isRecent
        ? [
            { day: boundary, downloads: 10 },
            { day: newest, downloads: 20 },
          ]
        : [
            { day: oldest, downloads: 5 },
            { day: boundary, downloads: 99 },
          ];
      return Promise.resolve(makeResponse(200, flatBody("react", downloads)));
    });

    const result = await fetchNpmDownloadsAdaptive(["react"], {
      startDate,
      fetchImpl: asFetch(fetchImpl),
      retry: FAST_RETRY,
    });

    expect(windows).toHaveLength(2);
    expect(fetchImpl).toHaveBeenCalledTimes(2);

    const dates = result.data.react?.map((entry) => entry.date);
    expect(dates).toEqual([oldest, boundary, newest]);
    expect(new Set(dates).size).toBe(dates?.length);
    expect(result.errors).toEqual({});
  });
});

describe("fetchNpmDownloadsAdaptive - partial-failure isolation", () => {
  test("404 on a scoped package nulls it while siblings stay successful", async () => {
    const fetchImpl = vi.fn((url: string) => {
      if (url.includes("@scope/missing")) {
        return Promise.resolve(makeResponse(404));
      }
      return Promise.resolve(
        makeResponse(
          200,
          flatBody("react", [{ day: "2024-01-01", downloads: 100 }]),
        ),
      );
    });

    const result = await fetchNpmDownloadsAdaptive(
      ["react", "@scope/missing"],
      {
        startDate: daysAgo(30),
        fetchImpl: asFetch(fetchImpl),
        retry: FAST_RETRY,
      },
    );

    expect(result.data.react).toEqual([{ date: "2024-01-01", count: 100 }]);
    expect(result.data["@scope/missing"]).toBeNull();
    expect(result.errors["@scope/missing"]).toBe(
      'Package "@scope/missing" not found',
    );
    expect(result.errors.react).toBeUndefined();
  });

  test("200 with a not-found error body is non-retryable and nulls the package once", async () => {
    const fetchImpl = vi.fn(() =>
      Promise.resolve(
        makeResponse(200, { error: "package ghost-pkg not found" }),
      ),
    );

    const result = await fetchNpmDownloadsAdaptive(["ghost-pkg"], {
      startDate: daysAgo(30),
      fetchImpl: asFetch(fetchImpl),
      retry: FAST_RETRY,
    });

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(result.data["ghost-pkg"]).toBeNull();
    expect(result.errors["ghost-pkg"]).toBe('Package "ghost-pkg" not found');
  });

  test("a bulk package with one not-found window keeps data from successful windows", async () => {
    const today = getToday();
    const startDate = daysAgo(400);
    const windows = getTimePeriods(
      startDate,
      today,
      NPM_BULK_RANGE_API_PERIOD_DAYS,
      "days",
      FIRST_DAY,
    );
    const recent = windows.at(-1)!;

    const fetchImpl = vi.fn((url: string) => {
      const isRecent = startOf(url) === formatDate(recent.start);
      if (isRecent) {
        return Promise.resolve(
          makeResponse(
            200,
            flatBody("react", [{ day: "2024-01-02", downloads: 42 }]),
          ),
        );
      }
      return Promise.resolve(makeResponse(404));
    });

    const result = await fetchNpmDownloadsAdaptive(["react"], {
      startDate,
      fetchImpl: asFetch(fetchImpl),
      retry: FAST_RETRY,
    });

    expect(windows).toHaveLength(2);
    expect(result.data.react).toEqual([{ date: "2024-01-02", count: 42 }]);
    expect(result.errors.react).toBeUndefined();
  });
});

describe("fetchNpmDownloadsAdaptive - multi-window scoped packages", () => {
  const SCOPED = "@scope/young";
  const startDate = () => daysAgo(800);
  const monthWindows = () =>
    getTimePeriods(
      startDate(),
      getToday(),
      NPM_RANGE_API_PERIOD_MONTHS,
      "months",
      FIRST_DAY,
    );
  const isNewestWindow = (url: string) =>
    startOf(url) === formatDate(monthWindows().at(-1)!.start);
  const successResponse = () =>
    makeResponse(200, flatBody(SCOPED, [{ day: "2024-02-01", downloads: 9 }]));
  const noStatsResponse = () =>
    makeResponse(200, {
      error: `no stats for this package for this period (0002)`,
    });

  test("keeps data when early windows return no-stats bodies and a later window succeeds", async () => {
    const fetchImpl = vi.fn((url: string) =>
      Promise.resolve(
        isNewestWindow(url) ? successResponse() : noStatsResponse(),
      ),
    );

    const result = await fetchNpmDownloadsAdaptive([SCOPED], {
      startDate: startDate(),
      fetchImpl: asFetch(fetchImpl),
      retry: FAST_RETRY,
    });

    expect(monthWindows().length).toBeGreaterThan(1);
    expect(result.data[SCOPED]).toEqual([{ date: "2024-02-01", count: 9 }]);
    expect(result.errors[SCOPED]).toBeUndefined();
  });

  test("reports the package as not found when every window is not found", async () => {
    const fetchImpl = vi.fn(() => Promise.resolve(noStatsResponse()));

    const result = await fetchNpmDownloadsAdaptive([SCOPED], {
      startDate: startDate(),
      fetchImpl: asFetch(fetchImpl),
      retry: FAST_RETRY,
    });

    expect(fetchImpl).toHaveBeenCalledTimes(monthWindows().length);
    expect(result.data[SCOPED]).toBeNull();
    expect(result.errors[SCOPED]).toBe(`Package "${SCOPED}" not found`);
  });

  test("keeps data and reports a partial error when one window keeps failing with 5xx", async () => {
    vi.useRealTimers();
    const fetchImpl = vi.fn((url: string) =>
      Promise.resolve(
        isNewestWindow(url) ? successResponse() : makeResponse(503),
      ),
    );

    const result = await fetchNpmDownloadsAdaptive([SCOPED], {
      startDate: startDate(),
      fetchImpl: asFetch(fetchImpl),
      retry: FAST_RETRY,
    });

    expect(fetchImpl.mock.calls.length).toBeGreaterThan(monthWindows().length);
    expect(result.data[SCOPED]).toEqual([{ date: "2024-02-01", count: 9 }]);
    expect(result.errors[SCOPED]).toBe(
      `Some download data for "${SCOPED}" could not be loaded`,
    );
  });

  test("reports a load failure when windows mix not-found and 5xx with no data", async () => {
    vi.useRealTimers();
    const fetchImpl = vi.fn((url: string) => {
      if (!url.includes(SCOPED)) {
        return Promise.resolve(
          makeResponse(
            200,
            flatBody("react", [{ day: "2024-01-01", downloads: 1 }]),
          ),
        );
      }
      return Promise.resolve(
        isNewestWindow(url) ? makeResponse(503) : noStatsResponse(),
      );
    });

    const result = await fetchNpmDownloadsAdaptive(["react", SCOPED], {
      startDate: startDate(),
      fetchImpl: asFetch(fetchImpl),
      retry: FAST_RETRY,
    });

    expect(result.data[SCOPED]).toBeNull();
    expect(result.errors[SCOPED]).toBe(
      `Failed to load downloads for "${SCOPED}"`,
    );
    expect(result.data.react).not.toBeNull();
  });
});

describe("fetchNpmDownloadsAdaptive - retry behavior", () => {
  test("retries a 429 rate-limited window and recovers", async () => {
    let calls = 0;
    const fetchImpl = vi.fn(() => {
      calls += 1;
      if (calls < 3) {
        return Promise.resolve(makeResponse(429, undefined, {}));
      }
      return Promise.resolve(
        makeResponse(
          200,
          flatBody("flaky", [{ day: "2024-01-01", downloads: 7 }]),
        ),
      );
    });

    const result = await fetchNpmDownloadsAdaptive(["flaky"], {
      startDate: daysAgo(30),
      fetchImpl: asFetch(fetchImpl),
      retry: FAST_RETRY,
    });

    expect(fetchImpl.mock.calls.length).toBeGreaterThan(1);
    expect(fetchImpl).toHaveBeenCalledTimes(3);
    expect(result.data.flaky).toEqual([{ date: "2024-01-01", count: 7 }]);
    expect(result.errors.flaky).toBeUndefined();
    expect(result.stats.rateLimitEvents).toBeGreaterThan(0);
    expect(result.stats.totalRetries).toBeGreaterThan(0);
  });
});

describe("fetchNpmDownloadsAdaptive - systemic vs not-found outcomes", () => {
  test("rejects when every task fails with a non-notFound error and no data survives", async () => {
    vi.useRealTimers();
    const fetchImpl = vi.fn(() => Promise.resolve(makeResponse(500)));

    await expect(
      fetchNpmDownloadsAdaptive(["boom"], {
        startDate: daysAgo(30),
        fetchImpl: asFetch(fetchImpl),
        retry: FAST_RETRY,
      }),
    ).rejects.toThrow("Failed to fetch NPM download data");
  });

  test("resolves to all-null when every package is not found", async () => {
    const fetchImpl = vi.fn(() => Promise.resolve(makeResponse(404)));

    const result = await fetchNpmDownloadsAdaptive(["react", "vue"], {
      startDate: daysAgo(30),
      fetchImpl: asFetch(fetchImpl),
      retry: FAST_RETRY,
    });

    expect(result.data.react).toBeNull();
    expect(result.data.vue).toBeNull();
    expect(result.errors.react).toBe('Package "react" not found');
    expect(result.errors.vue).toBe('Package "vue" not found');
  });

  test("populates the errors map only for null packages, never for successful ones", async () => {
    const fetchImpl = vi.fn((url: string) => {
      if (url.includes("@gone/pkg")) {
        return Promise.resolve(makeResponse(404));
      }
      return Promise.resolve(
        makeResponse(
          200,
          flatBody("react", [{ day: "2024-01-01", downloads: 5 }]),
        ),
      );
    });

    const result = await fetchNpmDownloadsAdaptive(["react", "@gone/pkg"], {
      startDate: daysAgo(30),
      fetchImpl: asFetch(fetchImpl),
      retry: FAST_RETRY,
    });

    expect(result.data.react).not.toBeNull();
    expect(result.data["@gone/pkg"]).toBeNull();
    expect(Object.keys(result.errors)).toEqual(["@gone/pkg"]);
  });
});

describe("fetchNpmDownloadsAdaptive - upstream bounds", () => {
  const emptyBulk = (_url: string) =>
    Promise.resolve(makeResponse(200, bulkBody({})));

  test("clamps a start date before the npm API first day", async () => {
    const fetchImpl = vi.fn(emptyBulk);

    await fetchNpmDownloadsAdaptive(["react"], {
      startDate: new Date("1990-01-01T00:00:00.000Z"),
      fetchImpl: asFetch(fetchImpl),
      retry: FAST_RETRY,
    });

    const starts = fetchImpl.mock.calls.map((call) => startOf(call[0]));
    expect(starts.toSorted()[0]).toBe(NPM_API_FIRST_DAY);
  });

  test("dedupes repeated package names before building tasks", async () => {
    const fetchImpl = vi.fn(emptyBulk);

    const result = await fetchNpmDownloadsAdaptive(["@scope/a", "@scope/a"], {
      startDate: daysAgo(30),
      fetchImpl: asFetch(fetchImpl),
      retry: FAST_RETRY,
    });

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(result.stats.requestCount).toBe(1);
  });

  test("requests upstream data through the revalidating fetch cache", async () => {
    const fetchImpl = vi.fn(emptyBulk);

    await fetchNpmDownloadsAdaptive(["react"], {
      startDate: daysAgo(30),
      fetchImpl: asFetch(fetchImpl),
      retry: FAST_RETRY,
    });

    expect(fetchImpl).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ next: { revalidate: 3600 } }),
    );
  });

  test("serves SELECTED_PROJECTS_LIMIT scoped packages over the full history", async () => {
    const fetchImpl = vi.fn(emptyBulk);
    const packages = Array.from(
      { length: SELECTED_PROJECTS_LIMIT },
      (_, index) => `@scope/pkg-${index}`,
    );
    const fullHistoryWindows = getTimePeriods(
      new Date(`${NPM_API_FIRST_DAY}T00:00:00.000Z`),
      getToday(),
      NPM_RANGE_API_PERIOD_MONTHS,
      "months",
      FIRST_DAY,
    );

    const result = await fetchNpmDownloadsAdaptive(packages, {
      fetchImpl: asFetch(fetchImpl),
      retry: FAST_RETRY,
    });

    expect(result.stats.requestCount).toBe(
      SELECTED_PROJECTS_LIMIT * fullHistoryWindows.length,
    );
  });

  test("rejects more than SELECTED_PROJECTS_LIMIT unique packages before any upstream call", async () => {
    const fetchImpl = vi.fn(emptyBulk);
    const packages = Array.from(
      { length: SELECTED_PROJECTS_LIMIT + 1 },
      (_, index) => `@scope/pkg-${index}`,
    );

    await expect(
      fetchNpmDownloadsAdaptive(packages, {
        fetchImpl: asFetch(fetchImpl),
        retry: FAST_RETRY,
      }),
    ).rejects.toThrow("Too many packages requested");
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});

describe("fetchNpmDownloadsAdaptive - anchored window caching", () => {
  const emptyBulk = (_url: string, _init?: RequestInit) =>
    Promise.resolve(makeResponse(200, bulkBody({})));

  const fetchCalls = async (systemTime: string) => {
    vi.setSystemTime(new Date(systemTime));
    const fetchImpl = vi.fn(emptyBulk);
    await fetchNpmDownloadsAdaptive(["react"], {
      fetchImpl: asFetch(fetchImpl),
      retry: FAST_RETRY,
    });
    return fetchImpl.mock.calls.map(([url, init]) => ({
      url,
      revalidate: init?.next?.revalidate,
    }));
  };

  test("only the open window URL changes after UTC midnight", async () => {
    const today = await fetchCalls("2024-03-15T23:59:00.000Z");
    const tomorrow = await fetchCalls("2024-03-16T00:01:00.000Z");
    const urlsToday = today.map(({ url }) => url).toSorted();
    const urlsTomorrow = tomorrow.map(({ url }) => url).toSorted();

    expect(urlsTomorrow).toHaveLength(urlsToday.length);
    expect(urlsTomorrow.slice(0, -1)).toEqual(urlsToday.slice(0, -1));
    expect(urlsToday.at(-1)).toMatch(/:2024-03-15\/react$/);
    expect(urlsTomorrow.at(-1)).toMatch(/:2024-03-16\/react$/);
  });

  test("caches closed windows for 30 days and the open window for an hour", async () => {
    const calls = (await fetchCalls("2024-03-15T10:30:00.000Z")).toSorted(
      (a, b) => a.url.localeCompare(b.url),
    );

    expect(calls.length).toBeGreaterThan(1);
    expect(calls.slice(0, -1).map(({ revalidate }) => revalidate)).toEqual(
      calls.slice(0, -1).map(() => CLOSED_WINDOW_REVALIDATE_SECONDS),
    );
    expect(calls.at(-1)?.revalidate).toBe(3600);
  });

  test("keeps a window ending inside the npm lag period on the short cache", async () => {
    const calls = (await fetchCalls("2023-11-28T10:30:00.000Z")).toSorted(
      (a, b) => a.url.localeCompare(b.url),
    );
    const lagWindow = calls.find(({ url }) => url.includes(":2023-11-24/"));

    expect(lagWindow?.revalidate).toBe(3600);
    expect(calls.at(-1)?.revalidate).toBe(3600);
    expect(calls.at(-3)?.revalidate).toBe(CLOSED_WINDOW_REVALIDATE_SECONDS);
  });
});

describe("fetchNpmDownloadsAdaptive - abort", () => {
  test("rejects with the abort reason when the signal is already aborted", async () => {
    const controller = new AbortController();
    controller.abort();
    const fetchImpl = vi.fn();

    await expect(
      fetchNpmDownloadsAdaptive(["react"], {
        fetchImpl: asFetch(fetchImpl),
        retry: FAST_RETRY,
        signal: controller.signal,
      }),
    ).rejects.toMatchObject({ name: "AbortError" });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  test("rejects with a timeout reason when the signal times out mid-flight", async () => {
    const controller = new AbortController();
    const fetchImpl = vi.fn((_url: string, init?: RequestInit) => {
      controller.abort(new DOMException("timed out", "TimeoutError"));
      return Promise.reject(init?.signal?.reason ?? new Error("aborted"));
    });

    await expect(
      fetchNpmDownloadsAdaptive(["react"], {
        fetchImpl: asFetch(fetchImpl),
        retry: FAST_RETRY,
        signal: controller.signal,
      }),
    ).rejects.toMatchObject({ name: "TimeoutError" });
  });
});

describe("parsePackageList", () => {
  test("trims, drops empties, dedupes and sorts", () => {
    expect(parsePackageList(" vue,react,, vue ,@a/b")).toEqual([
      "@a/b",
      "react",
      "vue",
    ]);
  });

  test("returns an empty list for a missing value", () => {
    expect(parsePackageList(null)).toEqual([]);
  });
});

describe("hasTransientErrors", () => {
  test("ignores not-found errors", () => {
    expect(hasTransientErrors({ x: 'Package "x" not found' })).toBe(false);
  });

  test("flags any other error", () => {
    expect(hasTransientErrors({ x: 'Failed to load downloads for "x"' })).toBe(
      true,
    );
  });
});

describe("fetchNpmDownloadsAdaptive - rate limits and client errors", () => {
  test("honors the retry-after header on a 429 and recovers", async () => {
    vi.useRealTimers();
    let calls = 0;
    const fetchImpl = vi.fn(() => {
      calls += 1;
      if (calls === 1) {
        return Promise.resolve(
          makeResponse(429, undefined, { "retry-after": "1" }),
        );
      }
      return Promise.resolve(
        makeResponse(
          200,
          flatBody("limited", [{ day: "2024-01-01", downloads: 3 }]),
        ),
      );
    });

    const result = await fetchNpmDownloadsAdaptive(["limited"], {
      startDate: daysAgo(30),
      fetchImpl: asFetch(fetchImpl),
      retry: FAST_RETRY,
    });

    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(result.data.limited).toEqual([{ date: "2024-01-01", count: 3 }]);
    expect(result.stats.rateLimitEvents).toBeGreaterThan(0);
  });

  test("treats a non-404 4xx as a non-retryable failure", async () => {
    const fetchImpl = vi.fn((url: string) => {
      if (url.includes("@scope/forbidden")) {
        return Promise.resolve(makeResponse(403));
      }
      return Promise.resolve(
        makeResponse(
          200,
          flatBody("react", [{ day: "2024-01-01", downloads: 1 }]),
        ),
      );
    });

    const result = await fetchNpmDownloadsAdaptive(
      ["react", "@scope/forbidden"],
      {
        startDate: daysAgo(30),
        fetchImpl: asFetch(fetchImpl),
        retry: FAST_RETRY,
      },
    );

    expect(
      fetchImpl.mock.calls.filter((call) => call[0].includes("forbidden")),
    ).toHaveLength(1);
    expect(result.data["@scope/forbidden"]).toBeNull();
    expect(result.errors["@scope/forbidden"]).toBe(
      'Failed to load downloads for "@scope/forbidden"',
    );
  });

  test("rejects with the underlying AppError when an invalid body leaves no data", async () => {
    vi.useRealTimers();
    const fetchImpl = vi.fn(() =>
      Promise.resolve(makeResponse(200, { error: "upstream exploded" })),
    );

    await expect(
      fetchNpmDownloadsAdaptive(["boom"], {
        startDate: daysAgo(30),
        fetchImpl: asFetch(fetchImpl),
        retry: FAST_RETRY,
      }),
    ).rejects.toThrow("upstream exploded");
  });

  test("skips null entries in a bulk response", async () => {
    const fetchImpl = vi.fn(() =>
      Promise.resolve(
        makeResponse(200, {
          react: {
            package: "react",
            start: "2015-01-10",
            end: "2024-03-15",
            downloads: [{ day: "2024-01-01", downloads: 2 }],
          },
          ghost: null,
        }),
      ),
    );

    const result = await fetchNpmDownloadsAdaptive(["react", "ghost"], {
      startDate: daysAgo(30),
      fetchImpl: asFetch(fetchImpl),
      retry: FAST_RETRY,
    });

    expect(result.data.react).toEqual([{ date: "2024-01-01", count: 2 }]);
    expect(result.data.ghost).toBeNull();
    expect(result.errors).toEqual({});
  });

  test("uses the global fetch and default retry config when no overrides are given", async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve(
        makeResponse(
          200,
          flatBody("react", [{ day: "2024-01-01", downloads: 1 }]),
        ),
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchNpmDownloadsAdaptive(["react"], {
      startDate: daysAgo(30),
    });
    vi.unstubAllGlobals();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.data.react).toEqual([{ date: "2024-01-01", count: 1 }]);
  });

  test("works without any options", async () => {
    const fetchMock = vi.fn(() => Promise.resolve(makeResponse(404)));
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchNpmDownloadsAdaptive([]);
    vi.unstubAllGlobals();

    expect(result.data).toEqual({});
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test("ignores an invalid start date and falls back to the npm first day", async () => {
    const fetchImpl = vi.fn((_url: string) =>
      Promise.resolve(makeResponse(200, bulkBody({}))),
    );

    await fetchNpmDownloadsAdaptive(["react"], {
      startDate: new Date("not-a-date"),
      fetchImpl: asFetch(fetchImpl),
      retry: FAST_RETRY,
    });

    const starts = fetchImpl.mock.calls.map((call) => startOf(call[0]));
    expect(starts.toSorted()[0]).toBe(NPM_API_FIRST_DAY);
  });
});

describe("fetchNpmDownloadsAdaptive - e2e test proxy", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  test("bypasses the fetch cache when PP_E2E_TEST_PROXY is set", async () => {
    vi.stubEnv("PP_E2E_TEST_PROXY", "1");
    vi.resetModules();
    const { default: fetchProxied } =
      await import("@/api/fetchNpmDownloadsAdaptive");
    const fetchImpl = vi.fn((_url: string, _init?: RequestInit) =>
      Promise.resolve(makeResponse(200, bulkBody({}))),
    );

    await fetchProxied(["react"], {
      startDate: daysAgo(30),
      fetchImpl: asFetch(fetchImpl),
      retry: FAST_RETRY,
    });

    expect(fetchImpl).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ cache: "no-store" }),
    );
    expect(fetchImpl.mock.calls[0]![1]).not.toHaveProperty("next");
  });
});

describe("fetchNpmDownloadsAdaptive - trailing zero days", () => {
  test("drops trailing zero days that npm has not computed yet", async () => {
    const fetchImpl = vi.fn(() =>
      Promise.resolve(
        makeResponse(
          200,
          flatBody("@scope/a", [
            { day: "2024-03-10", downloads: 4 },
            { day: "2024-03-11", downloads: 0 },
            { day: "2024-03-12", downloads: 6 },
            { day: "2024-03-13", downloads: 0 },
            { day: "2024-03-14", downloads: 0 },
          ]),
        ),
      ),
    );

    const result = await fetchNpmDownloadsAdaptive(["@scope/a"], {
      startDate: daysAgo(10),
      fetchImpl: asFetch(fetchImpl),
      retry: FAST_RETRY,
    });

    expect(result.data["@scope/a"]?.map((entry) => entry.date)).toEqual([
      "2024-03-10",
      "2024-03-11",
      "2024-03-12",
    ]);
  });
});

const TODAY = startOfDay(toZonedTime(SYSTEM_TIME, "UTC"));
const REAL_COUNT = 5;

const bulkWindows = (from: Date, to: Date = TODAY) =>
  getTimePeriods(from, to, NPM_BULK_RANGE_API_PERIOD_DAYS, "days", FIRST_DAY);

const scopedWindows = (from: Date) =>
  getTimePeriods(from, TODAY, NPM_RANGE_API_PERIOD_MONTHS, "months", FIRST_DAY);

const FULL_BULK_WINDOWS = bulkWindows(FIRST_DAY);
const LATEST_BULK_WINDOW = FULL_BULK_WINDOWS.at(-1)!;

const dailyDownloads = (start: string, end: string, realStart: Date) =>
  eachDayOfInterval({ start: parseDate(start), end: parseDate(end) }).map(
    (day) => ({
      day: formatDate(day),
      downloads: day >= realStart ? REAL_COUNT : 0,
    }),
  );

const createRangeFetch = (
  realStarts: Record<string, Date>,
  overrides: (url: string) => Response | undefined = () => undefined,
) =>
  vi.fn((url: string) => {
    const override = overrides(url);
    if (override) return Promise.resolve(override);
    const [start, end] = rangeOf(url).split(":") as [string, string];
    const names = url.split("/range/")[1]!.split("/").slice(1).join("/");
    const entries = Object.fromEntries(
      names
        .split(",")
        .map((name) => [
          name,
          dailyDownloads(start, end, realStarts[name] ?? FIRST_DAY),
        ]),
    );
    const [only, ...rest] = Object.keys(entries);
    const body =
      rest.length === 0 && only
        ? flatBody(only, entries[only]!)
        : bulkBody(entries);
    return Promise.resolve(makeResponse(200, body));
  });

const urlsOf = (fetchImpl: { mock: { calls: [string, ...unknown[]][] } }) =>
  fetchImpl.mock.calls.map((call) => call[0]);

const expectContiguous = (series: { date: string }[] | null | undefined) => {
  const dates = series!.map((entry) => entry.date);
  const expected = eachDayOfInterval({
    start: parseDate(dates[0]!),
    end: parseDate(dates.at(-1)!),
  }).map(formatDate);
  expect(dates).toEqual(expected);
};

describe("fetchNpmDownloadsAdaptive - first-published start dates", () => {
  test("requests only the windows from first publish and zero-fills the series like a full-history fetch", async () => {
    const realStarts = {
      jirallm: daysAgo(60),
      quickurrence: daysAgo(100),
      "@doryski/release": daysAgo(30),
    };
    const packages = ["jirallm", "quickurrence", "@doryski/release"];

    const fullFetch = createRangeFetch(realStarts);
    const full = await fetchNpmDownloadsAdaptive(packages, {
      fetchImpl: asFetch(fullFetch),
      retry: FAST_RETRY,
    });

    const trimmedFetch = createRangeFetch(realStarts);
    const trimmed = await fetchNpmDownloadsAdaptive(packages, {
      firstPublished: realStarts,
      fetchImpl: asFetch(trimmedFetch),
      retry: FAST_RETRY,
    });

    const expectedBulk = bulkWindows(daysAgo(100)).map((w) =>
      buildUrl(w.start, w.end, "jirallm,quickurrence"),
    );
    const expectedScoped = scopedWindows(daysAgo(30)).map((w) =>
      buildUrl(w.start, w.end, "@doryski/release"),
    );

    expect(fullFetch).toHaveBeenCalledTimes(
      FULL_BULK_WINDOWS.length + scopedWindows(FIRST_DAY).length,
    );
    expect(expectedBulk).toHaveLength(1);
    expect(expectedScoped).toHaveLength(1);
    expect(urlsOf(trimmedFetch).sort()).toEqual(
      [...expectedBulk, ...expectedScoped].sort(),
    );
    expect(trimmed.stats.requestCount).toBe(2);

    expect(trimmed.errors).toEqual({});
    expect(trimmed.data).toEqual(full.data);
    packages.forEach((name) => {
      const series = trimmed.data[name]!;
      expect(series[0]).toEqual({ date: NPM_API_FIRST_DAY, count: 0 });
      expect(series.find((entry) => entry.count > 0)).toBeDefined();
      expect(series.at(-1)!.count).toBe(REAL_COUNT);
      expectContiguous(series);
    });
  });

  const olderStart = FULL_BULK_WINDOWS[3]!.start;
  const bulkFrom = (from: Date) => ({
    urls: bulkWindows(from).map((w) => buildUrl(w.start, w.end, "newpkg")),
  });

  test.each([
    {
      name: "missing entry falls back to full history",
      firstPublished: {},
      from: FIRST_DAY,
      seriesStart: NPM_API_FIRST_DAY,
    },
    {
      name: "invalid Date falls back to full history",
      firstPublished: { newpkg: new Date("not a date") },
      from: FIRST_DAY,
      seriesStart: NPM_API_FIRST_DAY,
    },
    {
      name: "date before NPM_API_FIRST_DAY falls back to full history",
      firstPublished: { newpkg: new Date("2010-06-01T00:00:00.000Z") },
      from: FIRST_DAY,
      seriesStart: NPM_API_FIRST_DAY,
    },
    {
      name: "date exactly on a window boundary starts at that window",
      firstPublished: { newpkg: olderStart },
      from: olderStart,
      seriesStart: NPM_API_FIRST_DAY,
    },
    {
      name: "date on the first day of the latest window requests only that window",
      firstPublished: { newpkg: LATEST_BULK_WINDOW.start },
      from: LATEST_BULK_WINDOW.start,
      seriesStart: NPM_API_FIRST_DAY,
    },
    {
      name: "startDate later than firstPublished wins with no zero-fill before its window",
      firstPublished: { newpkg: FULL_BULK_WINDOWS[2]!.start },
      startDate: sub(TODAY, { days: 100 }),
      from: sub(TODAY, { days: 100 }),
      seriesStart: formatDate(LATEST_BULK_WINDOW.start),
    },
  ])("$name", async ({ firstPublished, startDate, from, seriesStart }) => {
    const fetchImpl = createRangeFetch({});

    const result = await fetchNpmDownloadsAdaptive(["newpkg"], {
      startDate,
      firstPublished,
      fetchImpl: asFetch(fetchImpl),
      retry: FAST_RETRY,
    });

    const { urls } = bulkFrom(from);
    expect(urlsOf(fetchImpl).sort()).toEqual([...urls].sort());
    expect(result.stats.requestCount).toBe(urls.length);
    expect(result.errors).toEqual({});
    expect(result.data.newpkg![0]!.date).toBe(seriesStart);
    expectContiguous(result.data.newpkg);
  });

  test("full history is still requested when no firstPublished is given", async () => {
    const fetchImpl = createRangeFetch({});

    await fetchNpmDownloadsAdaptive(["newpkg"], {
      fetchImpl: asFetch(fetchImpl),
      retry: FAST_RETRY,
    });

    expect(fetchImpl).toHaveBeenCalledTimes(FULL_BULK_WINDOWS.length);
    expect(FULL_BULK_WINDOWS.length).toBeGreaterThan(5);
  });

  test("mixed unscoped group fetches bulk windows from the older package", async () => {
    const oldStart = FULL_BULK_WINDOWS[2]!.start;
    const newStart = daysAgo(30);
    const fetchImpl = createRangeFetch({ oldpkg: oldStart, newpkg: newStart });

    const result = await fetchNpmDownloadsAdaptive(["oldpkg", "newpkg"], {
      firstPublished: { oldpkg: oldStart, newpkg: newStart },
      fetchImpl: asFetch(fetchImpl),
      retry: FAST_RETRY,
    });

    const expected = bulkWindows(oldStart).map((w) =>
      buildUrl(w.start, w.end, "oldpkg,newpkg"),
    );
    expect(expected.length).toBe(FULL_BULK_WINDOWS.length - 2);
    expect(urlsOf(fetchImpl).sort()).toEqual([...expected].sort());

    ["oldpkg", "newpkg"].forEach((name) => {
      const series = result.data[name]!;
      expect(series[0]).toEqual({ date: NPM_API_FIRST_DAY, count: 0 });
      expectContiguous(series);
    });
    expect(
      result.data.oldpkg!.filter((entry) => entry.date < formatDate(oldStart))
        .length,
    ).toBeGreaterThan(0);
    expect(result.data.newpkg!.find((entry) => entry.count > 0)!.date).toBe(
      formatDate(newStart),
    );
  });

  test("not-found package with firstPublished is not zero-filled and keeps not-found semantics", async () => {
    const fetchImpl = createRangeFetch({}, () => makeResponse(404));

    const result = await fetchNpmDownloadsAdaptive(["ghost"], {
      firstPublished: { ghost: daysAgo(30) },
      fetchImpl: asFetch(fetchImpl),
      retry: FAST_RETRY,
    });

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(result.data.ghost).toBeNull();
    expect(result.errors).toEqual({ ghost: notFoundMessage("ghost") });
  });

  test("failed package with firstPublished is not zero-filled while siblings succeed", async () => {
    vi.useRealTimers();
    const fetchImpl = createRangeFetch({}, (url) =>
      url.includes("@scope/broken") ? makeResponse(500) : undefined,
    );

    const result = await fetchNpmDownloadsAdaptive(
      ["newpkg", "@scope/broken"],
      {
        firstPublished: { newpkg: daysAgo(30), "@scope/broken": daysAgo(30) },
        fetchImpl: asFetch(fetchImpl),
        retry: FAST_RETRY,
      },
    );

    expect(result.data["@scope/broken"]).toBeNull();
    expect(result.errors).toEqual({
      "@scope/broken": 'Failed to load downloads for "@scope/broken"',
    });
    expect(result.data.newpkg![0]).toEqual({
      date: NPM_API_FIRST_DAY,
      count: 0,
    });
  });

  test("partial failure with firstPublished keeps the zero-filled prefix and reports a partial warning", async () => {
    vi.useRealTimers();
    const windows = bulkWindows(FIRST_DAY, getToday());
    const olderWindow = windows.at(-2)!;
    const latestWindow = windows.at(-1)!;
    const firstPublished = olderWindow.start;
    const fetchImpl = createRangeFetch({}, (url) =>
      startOf(url) === formatDate(olderWindow.start)
        ? makeResponse(500)
        : undefined,
    );

    const result = await fetchNpmDownloadsAdaptive(["newpkg"], {
      firstPublished: { newpkg: firstPublished },
      fetchImpl: asFetch(fetchImpl),
      retry: FAST_RETRY,
    });

    const series = result.data.newpkg!;
    const olderStartDate = formatDate(olderWindow.start);
    const latestStartDate = formatDate(latestWindow.start);
    const prefix = series.filter((entry) => entry.date < olderStartDate);

    expect(fetchImpl.mock.calls.length).toBeGreaterThanOrEqual(2);
    expect(series[0]).toEqual({ date: NPM_API_FIRST_DAY, count: 0 });
    expect(prefix.length).toBeGreaterThan(0);
    expect(prefix.every((entry) => entry.count === 0)).toBe(true);
    expect(
      series.some(
        (entry) => entry.date > olderStartDate && entry.date < latestStartDate,
      ),
    ).toBe(false);
    expect(series.find((entry) => entry.date === latestStartDate)?.count).toBe(
      REAL_COUNT,
    );
    expect(result.errors).toEqual({
      newpkg: 'Some download data for "newpkg" could not be loaded',
    });
  });
});
