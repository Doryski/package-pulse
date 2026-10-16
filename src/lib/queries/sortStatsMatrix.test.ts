import {
  GetStatsMatrixResult,
  StatsRow,
} from "@/app/(home)/utils/getStatsMatrix";
import { BreakDropIndicator } from "@/lib/utils/calculateBreakDrop";
import { describe, expect, it } from "vitest";
import { sortStatsMatrix } from "./useProjectsStats";

type RowOverrides = Partial<StatsRow> & { projectName: string };

const baseBreakDrop: BreakDropIndicator = {
  christmasDropPercentage: 0,
  weekendDropPercentage: 0,
  corporateUsageScore: 0,
  corporateUsageLevel: "very_low",
  hasEnoughData: false,
};

function makeRow(overrides: RowOverrides): StatsRow {
  return {
    projectName: overrides.projectName,
    color: overrides.color ?? "hsl(var(--chart-1))",
    weeklyChange: overrides.weeklyChange ?? null,
    monthlyChange: overrides.monthlyChange ?? null,
    yearlyChange: overrides.yearlyChange ?? null,
    yoyWeekChange: overrides.yoyWeekChange ?? null,
    yoyMonthChange: overrides.yoyMonthChange ?? null,
    vibeCodingEraChange: overrides.vibeCodingEraChange ?? null,
    breakDropIndicator: overrides.breakDropIndicator ?? baseBreakDrop,
  };
}

function makeMatrix(stats: StatsRow[]): GetStatsMatrixResult {
  return {
    stats,
    dates: {
      recentFullWeek: undefined,
      previousFullWeek: undefined,
      recentFullMonth: undefined,
      previousFullMonth: undefined,
      recentFullYear: undefined,
      previousFullYear: undefined,
      lastYearsReferenceWeek: undefined,
      lastYearsReferenceMonth: undefined,
      vibeCodingEraReferenceWeek: undefined,
    },
  };
}

const names = (rows: StatsRow[]) => rows.map((row) => row.projectName);

describe("sortStatsMatrix", () => {
  it("returns an empty array when there is no stats data", () => {
    const result = sortStatsMatrix(
      undefined as unknown as GetStatsMatrixResult,
      "weekly",
      "asc",
    );
    expect(result).toEqual([]);
  });

  it("sorts by projectName ascending and descending", () => {
    const matrix = makeMatrix([
      makeRow({ projectName: "charlie" }),
      makeRow({ projectName: "alpha" }),
      makeRow({ projectName: "bravo" }),
    ]);

    expect(names(sortStatsMatrix(matrix, "projectName", "asc"))).toEqual([
      "alpha",
      "bravo",
      "charlie",
    ]);
    expect(names(sortStatsMatrix(matrix, "projectName", "desc"))).toEqual([
      "charlie",
      "bravo",
      "alpha",
    ]);
  });

  it("sorts by breakDrop corporateUsageScore with null fallback to 0", () => {
    const matrix = makeMatrix([
      makeRow({
        projectName: "high",
        breakDropIndicator: { ...baseBreakDrop, corporateUsageScore: 90 },
      }),
      makeRow({
        projectName: "nullScore",
        breakDropIndicator: { ...baseBreakDrop, corporateUsageScore: null },
      }),
      makeRow({
        projectName: "mid",
        breakDropIndicator: { ...baseBreakDrop, corporateUsageScore: 40 },
      }),
    ]);

    expect(names(sortStatsMatrix(matrix, "breakDrop", "asc"))).toEqual([
      "nullScore",
      "mid",
      "high",
    ]);
    expect(names(sortStatsMatrix(matrix, "breakDrop", "desc"))).toEqual([
      "high",
      "mid",
      "nullScore",
    ]);
  });

  it("sorts by vibeCodingEra percentage with null fallback to 0", () => {
    const matrix = makeMatrix([
      makeRow({
        projectName: "up",
        vibeCodingEraChange: { nominal: 0, percentage: 120 },
      }),
      makeRow({ projectName: "none", vibeCodingEraChange: null }),
      makeRow({
        projectName: "down",
        vibeCodingEraChange: { nominal: 0, percentage: -30 },
      }),
    ]);

    expect(names(sortStatsMatrix(matrix, "vibeCodingEra", "asc"))).toEqual([
      "down",
      "none",
      "up",
    ]);
    expect(names(sortStatsMatrix(matrix, "vibeCodingEra", "desc"))).toEqual([
      "up",
      "none",
      "down",
    ]);
  });

  it("sorts by dynamic change columns with null fallback to 0", () => {
    const matrix = makeMatrix([
      makeRow({
        projectName: "big",
        weeklyChange: { nominal: 0, percentage: 75 },
      }),
      makeRow({ projectName: "missing", weeklyChange: null }),
      makeRow({
        projectName: "small",
        weeklyChange: { nominal: 0, percentage: -10 },
      }),
    ]);

    expect(names(sortStatsMatrix(matrix, "weekly", "asc"))).toEqual([
      "small",
      "missing",
      "big",
    ]);
    expect(names(sortStatsMatrix(matrix, "weekly", "desc"))).toEqual([
      "big",
      "missing",
      "small",
    ]);
  });

  it("supports each dynamic change column", () => {
    const matrix = makeMatrix([
      makeRow({
        projectName: "low",
        monthlyChange: { nominal: 0, percentage: 1 },
        yearlyChange: { nominal: 0, percentage: 1 },
        yoyWeekChange: { nominal: 0, percentage: 1 },
        yoyMonthChange: { nominal: 0, percentage: 1 },
      }),
      makeRow({
        projectName: "high",
        monthlyChange: { nominal: 0, percentage: 99 },
        yearlyChange: { nominal: 0, percentage: 99 },
        yoyWeekChange: { nominal: 0, percentage: 99 },
        yoyMonthChange: { nominal: 0, percentage: 99 },
      }),
    ]);

    expect(names(sortStatsMatrix(matrix, "monthly", "desc"))).toEqual([
      "high",
      "low",
    ]);
    expect(names(sortStatsMatrix(matrix, "yearly", "desc"))).toEqual([
      "high",
      "low",
    ]);
    expect(names(sortStatsMatrix(matrix, "yoyWeek", "desc"))).toEqual([
      "high",
      "low",
    ]);
    expect(names(sortStatsMatrix(matrix, "yoyMonth", "desc"))).toEqual([
      "high",
      "low",
    ]);
  });

  it("does not mutate the original stats order", () => {
    const stats = [
      makeRow({ projectName: "b" }),
      makeRow({ projectName: "a" }),
    ];
    const matrix = makeMatrix(stats);
    sortStatsMatrix(matrix, "projectName", "asc");
    expect(names(matrix.stats)).toEqual(["b", "a"]);
  });
});
