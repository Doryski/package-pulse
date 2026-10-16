import { notFoundMessage } from "@/api/downloadsLoader";
import { renderWithForm } from "@/test/render";
import { QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  toastError: vi.fn(),
  toastWarning: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: { error: mocks.toastError, warning: mocks.toastWarning },
}));

import { StatsRow } from "@/app/(home)/utils/getStatsMatrix";
import { getProjectStatsQueryKey } from "./keys";
import useProjectsStats, {
  getProjectStatsStaleTime,
  PARTIAL_STATS_STALE_MS,
  ProjectStats,
  projectStatsQueryOptions,
  sortStatsMatrix,
} from "./useProjectsStats";

const fetchMock = vi.fn<typeof fetch>();

const series = (days: number, start = "2024-01-01") => ({
  start,
  counts: Array.from({ length: days }, (_, index) => 1000 + index),
});

const jsonResponse = (body: unknown, status = 200) =>
  Response.json(body, { status });

const seriesResponse = (names: string[]) =>
  jsonResponse({
    data: Object.fromEntries(names.map((name) => [name, series(21)])),
    errors: {},
  });

const requestedPackages = () =>
  fetchMock.mock.calls.map(([url]) =>
    new URL(String(url), "http://localhost").searchParams.get("packages"),
  );

const respondWithRequestedSeries = () =>
  fetchMock.mockImplementation(async (url) => {
    const packages =
      new URL(String(url), "http://localhost").searchParams
        .get("packages")
        ?.split(",") ?? [];
    return seriesResponse(packages);
  });

const setup = (projects: string[]) => {
  const rendered = renderWithForm(<div />, { projects });
  const hook = renderHook(
    ({ selected }) => useProjectsStats(selected, rendered.form),
    {
      initialProps: { selected: projects },
      wrapper: ({ children }) => (
        <QueryClientProvider client={rendered.queryClient}>
          {children}
        </QueryClientProvider>
      ),
    },
  );
  return { ...hook, form: rendered.form, queryClient: rendered.queryClient };
};

describe("useProjectsStats", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
    mocks.toastError.mockReset();
    mocks.toastWarning.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  test("builds stats with a summary for found packages", async () => {
    fetchMock.mockResolvedValue(seriesResponse(["react"]));

    const { result } = setup(["react"]);

    await waitFor(() => expect(result.current).toHaveLength(1));
    const query = result.current[0];
    if (!query) throw new Error("expected a query");
    expect(query.data.projectName).toBe("react");
    expect(query.data.groupedByWeekData.length).toBeGreaterThan(0);
    expect(query.data.summary.latestDownloads).toBe(1020);
    expect(query.data.summary.peakDownloads).toBe(1020);
    expect(query.data).not.toHaveProperty("rawSortedData");
    expect(requestedPackages()).toEqual(["react"]);
    expect(mocks.toastError).not.toHaveBeenCalled();
  });

  test("handles a package with no download entries", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ data: { react: { start: "", counts: [] } } }),
    );

    const { result } = setup(["react"]);

    await waitFor(() => expect(result.current).toHaveLength(1));
    expect(result.current[0]?.data.summary.latestDownloads).toBe(0);
    expect(result.current[0]?.data.groupedByWeekData).toEqual([]);
  });

  test("returns nothing before data arrives", () => {
    fetchMock.mockReturnValue(new Promise(() => {}));

    const { result } = setup(["react"]);

    expect(result.current).toEqual([]);
  });

  test("loads every selected package in one batched request", async () => {
    respondWithRequestedSeries();
    const projects = ["e", "d", "c", "b", "a"];

    const { result } = setup(projects);

    await waitFor(() => expect(result.current).toHaveLength(5));
    expect(requestedPackages()).toEqual(["a,b,c,d,e"]);
  });

  test("adding a 6th package to 5 loaded ones requests only the new package", async () => {
    respondWithRequestedSeries();
    const loaded = ["e", "d", "c", "b", "a"];
    const { result, rerender } = setup(loaded);
    await waitFor(() => expect(result.current).toHaveLength(5));
    fetchMock.mockClear();

    rerender({ selected: [...loaded, "f"] });

    await waitFor(() => expect(result.current).toHaveLength(6));
    expect(requestedPackages()).toEqual(["f"]);
    expect(result.current.map((query) => query.data.projectName)).toEqual([
      ...loaded,
      "f",
    ]);
  });

  test("stays fresh until the next UTC midnight after it loaded", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2024-03-05T23:00:00Z"));
    fetchMock.mockResolvedValue(seriesResponse(["react"]));

    const { result, queryClient } = setup(["react"]);

    await waitFor(() => expect(result.current).toHaveLength(1));
    const query = queryClient
      .getQueryCache()
      .find<ProjectStats>({ queryKey: getProjectStatsQueryKey("react") });
    if (!query) throw new Error("expected a cached query");
    expect(getProjectStatsStaleTime(query)).toBe(60 * 60 * 1000);
    const isStale = () => query.isStaleByTime(getProjectStatsStaleTime(query));
    expect(isStale()).toBe(false);

    vi.setSystemTime(new Date("2024-03-06T00:00:01Z"));

    expect(isStale()).toBe(true);
  });

  test("refreshes partial data after a few minutes instead of at midnight", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        data: { react: series(21) },
        errors: { react: 'Some download data for "react" could not be loaded' },
      }),
    );

    const { result, queryClient } = setup(["react"]);

    await waitFor(() => expect(result.current).toHaveLength(1));
    const query = queryClient
      .getQueryCache()
      .find<ProjectStats>({ queryKey: getProjectStatsQueryKey("react") });
    if (!query) throw new Error("expected a cached query");
    expect(query.state.data?.isPartial).toBe(true);
    expect(getProjectStatsStaleTime(query)).toBe(PARTIAL_STATS_STALE_MS);
  });

  test("sets a form error and toasts the server error message", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ error: "Rate limited" }, 429));

    const { form } = setup(["react"]);

    await waitFor(() =>
      expect(mocks.toastError).toHaveBeenCalledWith("Rate limited", {
        id: "Rate limited",
      }),
    );
    expect(form.getFieldState("projects.0").error?.message).toBe(
      "Rate limited",
    );
  });

  test("uses generic messages for unknown errors", async () => {
    fetchMock.mockRejectedValue(new TypeError("network"));

    const { form } = setup(["react"]);

    await waitFor(() =>
      expect(mocks.toastError).toHaveBeenCalledWith(
        "Failed to fetch NPM download data",
        { id: "Failed to fetch NPM download data" },
      ),
    );
    expect(form.getFieldState("projects.0").error?.message).toBe(
      "Something went wrong. Please try again.",
    );
  });

  test("treats a package missing from the batch as not found", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ data: {}, errors: {} }));

    const { form, result } = setup(["ghost"]);

    await waitFor(() =>
      expect(mocks.toastError).toHaveBeenCalledWith(notFoundMessage("ghost"), {
        id: notFoundMessage("ghost"),
      }),
    );
    expect(form.getFieldState("projects.0").error?.message).toBe(
      notFoundMessage("ghost"),
    );
    expect(result.current).toEqual([]);
  });

  test("uses the batch error for a missing package when provided", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        data: { ghost: null },
        errors: { ghost: "Package ghost is private" },
      }),
    );

    setup(["ghost"]);

    await waitFor(() =>
      expect(mocks.toastError).toHaveBeenCalledWith(
        "Package ghost is private",
        { id: "Package ghost is private" },
      ),
    );
  });

  test("warns about partial errors while still returning data", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        data: { react: series(14) },
        errors: { react: "Partial data" },
      }),
    );

    const { result } = setup(["react"]);

    await waitFor(() => expect(result.current).toHaveLength(1));
    expect(mocks.toastWarning).toHaveBeenCalledWith("Partial data", {
      id: "Partial data",
    });
  });

  test("cancels the request without reporting an error on unmount", async () => {
    fetchMock.mockImplementation(
      (_, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () =>
            reject(new DOMException("aborted", "AbortError")),
          );
        }),
    );

    const { unmount, form } = setup(["react"]);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const signal = fetchMock.mock.calls[0]?.[1]?.signal;

    unmount();

    await waitFor(() => expect(signal?.aborted).toBe(true));
    expect(mocks.toastError).not.toHaveBeenCalled();
    expect(form.getFieldState("projects.0").error).toBeUndefined();
  });
});

describe("projectStatsQueryOptions", () => {
  test("shares the stats key, retry and staleTime used by useProjectsStats", () => {
    const options = projectStatsQueryOptions("react");

    expect(options.queryKey).toEqual(getProjectStatsQueryKey("react"));
    expect(options.retry).toBe(false);
    expect(options.staleTime).toBe(getProjectStatsStaleTime);
    expect(options.queryFn).toEqual(expect.any(Function));
  });
});

describe("sortStatsMatrix with missing changes", () => {
  const emptyRow = (projectName: string): StatsRow => ({
    projectName,
    color: "hsl(var(--chart-1))",
    weeklyChange: null,
    monthlyChange: null,
    yearlyChange: null,
    yoyWeekChange: null,
    yoyMonthChange: null,
    vibeCodingEraChange: null,
    breakDropIndicator: {
      christmasDropPercentage: 0,
      weekendDropPercentage: 0,
      corporateUsageScore: null,
      corporateUsageLevel: "very_low",
      hasEnoughData: false,
    },
  });

  test.each([
    "breakDrop",
    "vibeCodingEra",
    "weekly",
    "monthly",
    "yearly",
    "yoyWeek",
    "yoyMonth",
  ] as const)("treats missing %s values as zero", (column) => {
    const dates = {
      recentFullWeek: undefined,
      previousFullWeek: undefined,
      recentFullMonth: undefined,
      previousFullMonth: undefined,
      recentFullYear: undefined,
      previousFullYear: undefined,
      lastYearsReferenceWeek: undefined,
      lastYearsReferenceMonth: undefined,
      vibeCodingEraReferenceWeek: undefined,
    };
    const sorted = sortStatsMatrix(
      { stats: [emptyRow("a"), emptyRow("b")], dates },
      column,
      "desc",
    );

    expect(sorted.map((row) => row.projectName)).toEqual(["a", "b"]);
  });
});
