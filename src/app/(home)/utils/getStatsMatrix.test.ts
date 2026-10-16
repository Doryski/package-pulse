import { UseQueryResult } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import { ProjectStats } from "@/lib/queries/useProjectsStats";
import { DownloadStat, groupByWeeks } from "@/lib/utils/groupByPeriod";
import getStatsMatrix from "./getStatsMatrix";

function makeQuery(
  projectName: string,
  rawSortedData: DownloadStat[],
): UseQueryResult<ProjectStats> {
  return {
    data: {
      projectName,
      rawSortedData,
      groupedByWeekData: groupByWeeks(rawSortedData).slice(0, -1),
    },
  } as UseQueryResult<ProjectStats>;
}

const insufficientBreakDrop = {
  christmasDropPercentage: 0,
  weekendDropPercentage: 0,
  corporateUsageScore: 0,
  corporateUsageLevel: "very_low",
  hasEnoughData: false,
};

const comprehensiveData: DownloadStat[] = [
  { date: "2024-05-06", count: 10 },
  { date: "2024-11-04", count: 20 },
  { date: "2025-03-19", count: 30 },
  { date: "2025-05-05", count: 40 },
  { date: "2025-11-03", count: 50 },
  { date: "2026-05-04", count: 60 },
  { date: "2026-06-01", count: 70 },
];

describe("getStatsMatrix", () => {
  it("returns empty stats and undefined dates for empty input", () => {
    const result = getStatsMatrix([], undefined);

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

  it("skips queries without data", () => {
    const result = getStatsMatrix(
      [
        { data: undefined } as UseQueryResult<ProjectStats>,
        makeQuery("skip-single", [{ date: "2026-06-01", count: 5 }]),
      ],
      undefined,
    );

    expect(result.stats).toHaveLength(1);
    expect(result.stats[0]?.projectName).toBe("skip-single");
  });

  it("computes exact StatChange values for all metrics", () => {
    const result = getStatsMatrix(
      [makeQuery("comprehensive", comprehensiveData)],
      undefined,
    );
    const row = result.stats[0]!;

    expect(row.projectName).toBe("comprehensive");

    expect(row.weeklyChange?.nominal).toBe(10);
    expect(row.weeklyChange?.percentage).toBeCloseTo(20, 10);

    expect(row.monthlyChange?.nominal).toBe(10);
    expect(row.monthlyChange?.percentage).toBeCloseTo(20, 10);

    expect(row.yearlyChange).toEqual({ nominal: 90, percentage: 300 });

    expect(row.yoyWeekChange).toEqual({ nominal: 20, percentage: 50 });
    expect(row.yoyMonthChange).toEqual({ nominal: 20, percentage: 50 });

    expect(row.vibeCodingEraChange).toEqual({ nominal: 30, percentage: 100 });
  });

  it("collects reference dates from the first eligible package", () => {
    const result = getStatsMatrix(
      [makeQuery("comprehensive-dates", comprehensiveData)],
      undefined,
    );

    expect(result.dates.recentFullWeek).toEqual({
      start: "2026-05-04",
      end: "2026-05-10",
      count: 60,
    });
    expect(result.dates.previousFullWeek).toEqual({
      start: "2025-11-03",
      end: "2025-11-09",
      count: 50,
    });
    expect(result.dates.recentFullMonth).toEqual({
      start: "2026-05-01",
      end: "2026-05-31",
      count: 60,
    });
    expect(result.dates.previousFullMonth).toEqual({
      start: "2025-11-01",
      end: "2025-11-30",
      count: 50,
    });
    expect(result.dates.recentFullYear).toEqual({
      start: "2025-01-01",
      end: "2025-12-31",
      count: 120,
    });
    expect(result.dates.previousFullYear).toEqual({
      start: "2024-01-01",
      end: "2024-12-31",
      count: 30,
    });
    expect(result.dates.lastYearsReferenceWeek).toEqual({
      start: "2025-05-05",
      end: "2025-05-11",
      count: 40,
    });
    expect(result.dates.lastYearsReferenceMonth).toEqual({
      start: "2025-05-01",
      end: "2025-05-31",
      count: 40,
    });
    expect(result.dates.vibeCodingEraReferenceWeek).toEqual({
      start: "2025-03-17",
      end: "2025-03-23",
      count: 30,
    });
  });

  it("returns null changes for a package with insufficient data", () => {
    const result = getStatsMatrix(
      [
        makeQuery("insufficient", [
          { date: "2026-06-01", count: 10 },
          { date: "2026-06-02", count: 20 },
        ]),
      ],
      undefined,
    );
    const row = result.stats[0]!;

    expect(row.weeklyChange).toBeNull();
    expect(row.monthlyChange).toBeNull();
    expect(row.yearlyChange).toBeNull();
    expect(row.yoyWeekChange).toBeNull();
    expect(row.yoyMonthChange).toBeNull();
    expect(row.vibeCodingEraChange).toBeNull();

    expect(result.dates.recentFullWeek).toBeUndefined();
    expect(result.dates.vibeCodingEraReferenceWeek).toBeUndefined();
  });

  it("wires breakDropIndicator from calculateBreakDrop", () => {
    const result = getStatsMatrix(
      [makeQuery("breakdrop-insufficient", comprehensiveData)],
      undefined,
    );

    expect(result.stats[0]?.breakDropIndicator).toEqual(insufficientBreakDrop);
  });

  it("assigns colors per index for a known theme", () => {
    const result = getStatsMatrix(
      [
        makeQuery("colored-a", comprehensiveData),
        makeQuery("colored-b", comprehensiveData),
      ],
      "light",
    );

    expect(result.stats).toHaveLength(2);
    expect(result.stats[0]?.color).not.toBe(result.stats[1]?.color);
  });

  it("returns the cached row for identical repeated input", () => {
    const query = makeQuery("cache-hit", comprehensiveData);

    const first = getStatsMatrix([query], "light");
    const second = getStatsMatrix([query], "light");

    expect(second.stats[0]).toBe(first.stats[0]);
  });

  it("evicts old cache entries beyond the limit and still computes correctly", () => {
    const queries = Array.from({ length: 120 }, (_, index) =>
      makeQuery(`evict-${index}`, comprehensiveData),
    );

    const first = getStatsMatrix(queries, undefined);
    const second = getStatsMatrix(queries, undefined);

    expect(second.stats).toHaveLength(120);
    expect(second.stats[0]).not.toBe(first.stats[0]);
    expect(second.stats[0]?.yearlyChange).toEqual(first.stats[0]?.yearlyChange);
  });
});
