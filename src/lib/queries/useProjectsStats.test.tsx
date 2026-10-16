import { buildDownloadStats } from "@/test/factories";
import { renderWithForm } from "@/test/render";
import { QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  fetchDownloadsBatch: vi.fn(),
  toastError: vi.fn(),
  toastWarning: vi.fn(),
}));

vi.mock("@/api/fetchDownloadsBatch", () => ({
  default: mocks.fetchDownloadsBatch,
}));

vi.mock("sonner", () => ({
  toast: { error: mocks.toastError, warning: mocks.toastWarning },
}));

import AppError from "@/lib/utils/AppError";
import { StatsRow } from "@/app/(home)/utils/getStatsMatrix";
import useProjectsStats, { sortStatsMatrix } from "./useProjectsStats";

const setup = (projects: string[]) => {
  const rendered = renderWithForm(<div />, { projects });
  const hook = renderHook(() => useProjectsStats(projects, rendered.form), {
    wrapper: ({ children }) => (
      <QueryClientProvider client={rendered.queryClient}>
        {children}
      </QueryClientProvider>
    ),
  });
  return { form: rendered.form, result: hook.result };
};

describe("useProjectsStats", () => {
  beforeEach(() => {
    mocks.fetchDownloadsBatch.mockReset();
    mocks.toastError.mockReset();
    mocks.toastWarning.mockReset();
  });

  test("returns grouped and sorted stats for found packages", async () => {
    mocks.fetchDownloadsBatch.mockResolvedValue({
      data: { react: buildDownloadStats(21).toReversed() },
      errors: {},
    });

    const { result } = setup(["react"]);

    await waitFor(() => expect(result.current).toHaveLength(1));
    const query = result.current[0];
    if (!query) throw new Error("expected a query");
    expect(query.data.projectName).toBe("react");
    expect(query.data.rawSortedData).toHaveLength(21);
    expect(query.data.rawSortedData[0]?.date).toBe("2024-01-01");
    expect(query.data.groupedByWeekData.length).toBeGreaterThan(0);
    expect(mocks.toastError).not.toHaveBeenCalled();
  });

  test("handles a package with no download entries", async () => {
    mocks.fetchDownloadsBatch.mockResolvedValue({
      data: { react: [] },
      errors: {},
    });

    const { result } = setup(["react"]);

    await waitFor(() => expect(result.current).toHaveLength(1));
    expect(result.current[0]?.data.rawSortedData).toEqual([]);
  });

  test("returns nothing before data arrives", () => {
    mocks.fetchDownloadsBatch.mockReturnValue(new Promise(() => {}));

    const { result } = setup(["react"]);

    expect(result.current).toEqual([]);
  });

  test("sets a form error and toasts the AppError message", async () => {
    mocks.fetchDownloadsBatch.mockRejectedValue(new AppError("Rate limited"));

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
    mocks.fetchDownloadsBatch.mockRejectedValue(new Error("network"));

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
    mocks.fetchDownloadsBatch.mockResolvedValue({ data: {}, errors: {} });

    const { form, result } = setup(["ghost"]);

    await waitFor(() =>
      expect(mocks.toastError).toHaveBeenCalledWith(
        'Package "ghost" not found',
        { id: 'Package "ghost" not found' },
      ),
    );
    expect(form.getFieldState("projects.0").error?.message).toBe(
      'Package "ghost" not found',
    );
    expect(result.current).toEqual([]);
  });

  test("uses the batch error for a missing package when provided", async () => {
    mocks.fetchDownloadsBatch.mockResolvedValue({
      data: {},
      errors: { ghost: "Package ghost is private" },
    });

    setup(["ghost"]);

    await waitFor(() =>
      expect(mocks.toastError).toHaveBeenCalledWith(
        "Package ghost is private",
        { id: "Package ghost is private" },
      ),
    );
  });

  test("warns about partial errors while still returning data", async () => {
    mocks.fetchDownloadsBatch.mockResolvedValue({
      data: { react: buildDownloadStats(14) },
      errors: { react: "Partial data" },
    });

    const { result } = setup(["react"]);

    await waitFor(() => expect(result.current).toHaveLength(1));
    expect(mocks.toastWarning).toHaveBeenCalledWith("Partial data", {
      id: "Partial data",
    });
  });
});

describe("sortStatsMatrix with missing changes", () => {
  const emptyRow = (projectName: string): StatsRow => ({
    projectName,
    color: undefined,
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
