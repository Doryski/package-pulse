import fetchNpmDownloadsAdaptive, {
  AdaptiveDownloadsResult,
} from "@/api/fetchNpmDownloadsAdaptive";
import { getProjectStatsQueryKey } from "@/lib/queries/keys";
import { buildProjectStats } from "@/lib/stats/buildProjectStats";
import { toCompactSeries } from "@/lib/utils/compactSeries";
import getFirstPublished from "@/lib/server/firstPublished";
import { QueryClient } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import prefetchCompareStats, {
  PREFETCH_TIMEOUT_MS,
  shouldSkipPrefetch,
} from "./prefetchCompareStats";

vi.mock("@/lib/server/firstPublished", () => ({ default: vi.fn() }));

vi.mock("@/api/fetchNpmDownloadsAdaptive", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/api/fetchNpmDownloadsAdaptive")>()),
  default: vi.fn(),
}));

const FIRST_PUBLISHED = { react: new Date(2013, 4, 29) };

const NOW = new Date("2024-03-10T12:00:00.000Z");

const SERIES = [
  { date: "2024-03-01", count: 10 },
  { date: "2024-03-02", count: 20 },
];

const buildResult = (
  overrides: Partial<AdaptiveDownloadsResult> = {},
): AdaptiveDownloadsResult => ({
  data: { react: SERIES, vue: SERIES },
  errors: {},
  stats: {
    requestCount: 1,
    rateLimitEvents: 0,
    totalRetries: 0,
    maxConcurrencyReached: 1,
    finalConcurrency: 1,
  },
  ...overrides,
});

const readStats = (queryClient: QueryClient, name: string) =>
  queryClient.getQueryData(getProjectStatsQueryKey(name));

describe("shouldSkipPrefetch", () => {
  it.each([
    [{ NEXT_PHASE: "phase-production-build" }, true],
    [{ PP_E2E_TEST_PROXY: "1" }, true],
    [{ NEXT_PHASE: "phase-production-server" }, false],
    [{}, false],
  ])("returns %o -> %s", (env, expected) => {
    expect(shouldSkipPrefetch(env)).toBe(expected);
  });
});

describe("prefetchCompareStats", () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: NOW, toFake: ["Date"] });
    vi.stubEnv("NEXT_PHASE", "");
    vi.stubEnv("PP_E2E_TEST_PROXY", "");
    vi.mocked(fetchNpmDownloadsAdaptive).mockResolvedValue(buildResult());
    vi.mocked(getFirstPublished).mockResolvedValue(FIRST_PUBLISHED);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it("seeds each project with the same shape the client query stores", async () => {
    const queryClient = new QueryClient();

    await prefetchCompareStats(queryClient, ["react", "vue"]);

    const expected = {
      ...buildProjectStats("react", toCompactSeries(SERIES)),
      isPartial: false,
    };
    expect(readStats(queryClient, "react")).toEqual(expected);
    expect(readStats(queryClient, "vue")).toEqual({
      ...expected,
      projectName: "vue",
    });
  });

  it("fetches all projects in one call with a 4 s timeout signal and first-published dates", async () => {
    const timeoutSpy = vi.spyOn(AbortSignal, "timeout");

    await prefetchCompareStats(new QueryClient(), ["react", "vue"]);

    expect(timeoutSpy).toHaveBeenCalledWith(PREFETCH_TIMEOUT_MS);
    expect(fetchNpmDownloadsAdaptive).toHaveBeenCalledWith(["react", "vue"], {
      signal: timeoutSpy.mock.results[0]?.value,
      firstPublished: FIRST_PUBLISHED,
    });
  });

  it("falls back to an empty firstPublished map when no lookup resolves", async () => {
    vi.mocked(getFirstPublished).mockResolvedValue({});

    await prefetchCompareStats(new QueryClient(), ["react"]);

    expect(fetchNpmDownloadsAdaptive).toHaveBeenCalledWith(["react"], {
      signal: expect.any(AbortSignal),
      firstPublished: {},
    });
  });

  it("shares one signal between the first-published lookup and the fetch", async () => {
    await prefetchCompareStats(new QueryClient(), ["react", "vue"]);

    expect(getFirstPublished).toHaveBeenCalledWith(
      ["react", "vue"],
      vi.mocked(fetchNpmDownloadsAdaptive).mock.calls[0]![1]!.signal,
    );
  });

  it("seeds partial data flagged for a quick refresh and skips missing projects", async () => {
    vi.mocked(fetchNpmDownloadsAdaptive).mockResolvedValue(
      buildResult({
        data: { react: SERIES, vue: SERIES, svelte: null },
        errors: { vue: "partial", svelte: 'Package "svelte" not found' },
      }),
    );
    const queryClient = new QueryClient();

    await prefetchCompareStats(queryClient, ["react", "vue", "svelte"]);

    expect(readStats(queryClient, "react")).toMatchObject({ isPartial: false });
    expect(readStats(queryClient, "vue")).toMatchObject({ isPartial: true });
    expect(readStats(queryClient, "svelte")).toBeUndefined();
  });

  it("skips a project whose stats cannot be built", async () => {
    vi.mocked(fetchNpmDownloadsAdaptive).mockResolvedValue(
      buildResult({ data: { react: SERIES, vue: [{ date: "x", count: 1 }] } }),
    );
    const queryClient = new QueryClient();

    await prefetchCompareStats(queryClient, ["react", "vue"]);

    expect(readStats(queryClient, "react")).toBeDefined();
    expect(readStats(queryClient, "vue")).toBeUndefined();
  });

  it("swallows upstream failures", async () => {
    vi.mocked(fetchNpmDownloadsAdaptive).mockRejectedValue(
      new Error("timeout"),
    );
    const queryClient = new QueryClient();

    await expect(
      prefetchCompareStats(queryClient, ["react"]),
    ).resolves.toBeUndefined();
    expect(queryClient.getQueryCache().getAll()).toHaveLength(0);
  });

  it.each([
    ["NEXT_PHASE", "phase-production-build"],
    ["PP_E2E_TEST_PROXY", "1"],
  ])("does nothing when %s=%s", async (name, value) => {
    vi.stubEnv(name, value);

    await prefetchCompareStats(new QueryClient(), ["react"]);

    expect(fetchNpmDownloadsAdaptive).not.toHaveBeenCalled();
  });

  it("does nothing without projects", async () => {
    await prefetchCompareStats(new QueryClient(), []);

    expect(fetchNpmDownloadsAdaptive).not.toHaveBeenCalled();
  });
});
