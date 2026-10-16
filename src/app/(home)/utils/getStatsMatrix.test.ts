import { ProjectStats } from "@/lib/queries/useProjectsStats";
import type { ProjectStatsSummary } from "@/lib/stats/buildProjectStats";
import { calculateBreakDrop } from "@/lib/utils/calculateBreakDrop";
import { buildProjectStats, buildSuccessQuery } from "@/test/factories";
import { UseQueryResult } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";
import getStatsMatrix from "./getStatsMatrix";

vi.mock("@/lib/utils/calculateBreakDrop", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/lib/utils/calculateBreakDrop")>();
  return { ...actual, calculateBreakDrop: vi.fn(actual.calculateBreakDrop) };
});

const period = (start: string, end: string, count: number) => ({
  start,
  end,
  count,
});

const insufficientBreakDrop = {
  christmasDropPercentage: 0,
  weekendDropPercentage: 0,
  corporateUsageScore: 0,
  corporateUsageLevel: "very_low",
  hasEnoughData: false,
} as const;

const EMPTY_SUMMARY: ProjectStatsSummary = {
  recentFullWeek: undefined,
  previousFullWeek: undefined,
  recentFullMonth: undefined,
  previousFullMonth: undefined,
  recentFullYear: undefined,
  previousFullYear: undefined,
  lastYearsReferenceWeek: undefined,
  lastYearsReferenceMonth: undefined,
  vibeCodingEraReferenceWeek: undefined,
  breakDropIndicator: insufficientBreakDrop,
  latestDownloads: 0,
  peakDownloads: 0,
};

const FULL_SUMMARY: ProjectStatsSummary = {
  ...EMPTY_SUMMARY,
  recentFullWeek: period("2026-05-04", "2026-05-10", 60),
  previousFullWeek: period("2026-04-27", "2026-05-03", 50),
  recentFullMonth: period("2026-05-01", "2026-05-31", 60),
  previousFullMonth: period("2026-04-01", "2026-04-30", 50),
  recentFullYear: period("2025-01-01", "2025-12-31", 120),
  previousFullYear: period("2024-01-01", "2024-12-31", 30),
  lastYearsReferenceWeek: period("2025-05-05", "2025-05-11", 40),
  lastYearsReferenceMonth: period("2025-05-01", "2025-05-31", 40),
  vibeCodingEraReferenceWeek: period("2025-03-17", "2025-03-23", 30),
};

const makeQuery = (
  projectName: string,
  summary: ProjectStatsSummary = FULL_SUMMARY,
) =>
  buildSuccessQuery<ProjectStats>({
    projectName,
    groupedByWeekData: [],
    summary,
  });

const pendingQuery = { data: undefined } as UseQueryResult<ProjectStats>;

describe("getStatsMatrix", () => {
  it("returns empty stats and undefined dates for empty input", () => {
    const result = getStatsMatrix([]);

    expect(result.stats).toEqual([]);
    expect(result.dates).toEqual({
      recentFullWeek: undefined,
      previousFullWeek: undefined,
      recentFullMonth: undefined,
      previousFullMonth: undefined,
      recentFullYear: undefined,
      previousFullYear: undefined,
      lastYearsReferenceWeek: undefined,
      lastYearsReferenceMonth: undefined,
      vibeCodingEraReferenceWeek: undefined,
    });
  });

  it("skips queries without data but keeps their color slot", () => {
    const result = getStatsMatrix([pendingQuery, makeQuery("second")]);

    expect(result.stats).toHaveLength(1);
    expect(result.stats[0]).toMatchObject({
      projectName: "second",
      color: "hsl(var(--chart-2))",
    });
  });

  it("computes exact StatChange values from the summary", () => {
    const row = getStatsMatrix([makeQuery("comprehensive")]).stats[0]!;

    expect(row.weeklyChange?.nominal).toBe(10);
    expect(row.weeklyChange?.percentage).toBeCloseTo(20, 10);
    expect(row.monthlyChange?.nominal).toBe(10);
    expect(row.monthlyChange?.percentage).toBeCloseTo(20, 10);
    expect(row.yearlyChange).toEqual({ nominal: 90, percentage: 300 });
    expect(row.yoyWeekChange).toEqual({ nominal: 20, percentage: 50 });
    expect(row.yoyMonthChange).toEqual({ nominal: 20, percentage: 50 });
    expect(row.vibeCodingEraChange).toEqual({ nominal: 30, percentage: 100 });
    expect(row.breakDropIndicator).toEqual(insufficientBreakDrop);
  });

  it("returns null changes when summary periods are missing", () => {
    const row = getStatsMatrix([makeQuery("insufficient", EMPTY_SUMMARY)])
      .stats[0]!;

    expect(row).toMatchObject({
      weeklyChange: null,
      monthlyChange: null,
      yearlyChange: null,
      yoyWeekChange: null,
      yoyMonthChange: null,
      vibeCodingEraChange: null,
    });
  });

  it("collects reference dates from the first eligible package", () => {
    const result = getStatsMatrix([
      makeQuery("short", {
        ...EMPTY_SUMMARY,
        recentFullWeek: period("2026-06-01", "2026-06-07", 1),
      }),
      makeQuery("eligible"),
    ]);

    expect(result.dates).toEqual({
      recentFullWeek: FULL_SUMMARY.recentFullWeek,
      previousFullWeek: FULL_SUMMARY.previousFullWeek,
      recentFullMonth: FULL_SUMMARY.recentFullMonth,
      previousFullMonth: FULL_SUMMARY.previousFullMonth,
      recentFullYear: FULL_SUMMARY.recentFullYear,
      previousFullYear: FULL_SUMMARY.previousFullYear,
      lastYearsReferenceWeek: FULL_SUMMARY.lastYearsReferenceWeek,
      lastYearsReferenceMonth: FULL_SUMMARY.lastYearsReferenceMonth,
      vibeCodingEraReferenceWeek: FULL_SUMMARY.vibeCodingEraReferenceWeek,
    });
  });

  it("assigns theme-independent CSS variable colors per index", () => {
    const result = getStatsMatrix([makeQuery("a"), makeQuery("b")]);

    expect(result.stats.map((row) => row.color)).toEqual([
      "hsl(var(--chart-1))",
      "hsl(var(--chart-2))",
    ]);
  });

  it("never recomputes the break-drop indicator for 10 packages", () => {
    const queries = Array.from({ length: 10 }, (_, index) =>
      buildSuccessQuery(buildProjectStats(`pkg-${index}`, { days: 400 })),
    );
    vi.mocked(calculateBreakDrop).mockClear();

    const first = getStatsMatrix(queries);
    const second = getStatsMatrix(queries);

    expect(calculateBreakDrop).not.toHaveBeenCalled();
    expect(second).toEqual(first);
  });
});
