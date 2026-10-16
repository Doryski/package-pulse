import getStatsMatrix, { StatChange } from "@/app/(home)/utils/getStatsMatrix";
import { VIBE_CODING_ERA_REFERENCE_DATE } from "@/lib/config/constants";
import { calculateBreakDrop } from "@/lib/utils/calculateBreakDrop";
import getPercentChange from "@/lib/utils/getPercentChange";
import {
  DownloadStat,
  groupByWeeks,
  groupStats,
  PeriodStat,
} from "@/lib/utils/groupByPeriod";
import { max } from "@/lib/utils/math";
import { buildSuccessQuery } from "@/test/factories";
import { isWithinInterval, subYears } from "date-fns";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CompactSeries } from "@/lib/utils/compactSeries";
import { buildProjectStats } from "./buildProjectStats";
import { fromDayNumber, isWeekend, toDayNumber, weekdayOf } from "./isoDay";

const NOW = new Date(2026, 0, 14, 12);

const expand = ({ start, counts }: CompactSeries): DownloadStat[] => {
  const startDayNumber = toDayNumber(start);
  return counts.flatMap((count, index) =>
    count === null
      ? []
      : [{ date: fromDayNumber(startDayNumber + index), count }],
  );
};

const makeSeries = (
  start: string,
  days: number,
  countAt: (isoDate: string, index: number) => number,
): CompactSeries => {
  const startDayNumber = toDayNumber(start);
  return {
    start,
    counts: Array.from({ length: days }, (_, index) =>
      countAt(fromDayNumber(startDayNumber + index), index),
    ),
  };
};

const isChristmasDip = (isoDate: string) => {
  const monthDay = isoDate.slice(5, 10);
  return monthDay >= "12-22" && monthDay <= "12-28";
};

const corporateCount = (isoDate: string, index: number) => {
  if (isChristmasDip(isoDate)) return 2500 + (index % 13);
  if (isWeekend(weekdayOf(isoDate))) return 4000 + (index % 17);
  return 12000 + index * 3;
};

const FIXTURES = [
  {
    name: "christmas-window",
    series: makeSeries("2019-11-03", 2265, corporateCount),
  },
  {
    name: "short-series",
    series: makeSeries("2025-08-01", 160, (_, index) => 9000 + index * 11),
  },
  {
    name: "low-average",
    series: makeSeries("2023-02-10", 1060, (isoDate, index) =>
      isWeekend(weekdayOf(isoDate)) ? 120 + (index % 5) : 900 + (index % 7),
    ),
  },
] as const;

const findYearBefore = (periods: PeriodStat[], recent?: PeriodStat) => {
  if (!recent) return undefined;
  const reference = subYears(recent.end, 1);
  return periods
    .toReversed()
    .find((period) => isWithinInterval(reference, period));
};

const legacySummary = (rawSortedData: DownloadStat[]) => {
  const { byWeeks, byMonths, byYears } = groupStats(rawSortedData);
  const recentFullWeek = byWeeks.at(-2);
  const recentFullMonth = byMonths.at(-2);
  const vibeCodingEraReferenceDate = new Date(VIBE_CODING_ERA_REFERENCE_DATE);
  return {
    recentFullWeek,
    previousFullWeek: byWeeks.at(-3),
    recentFullMonth,
    previousFullMonth: byMonths.at(-3),
    recentFullYear: byYears.at(-2),
    previousFullYear: byYears.at(-3),
    lastYearsReferenceWeek: findYearBefore(byWeeks, recentFullWeek),
    lastYearsReferenceMonth: findYearBefore(byMonths, recentFullMonth),
    vibeCodingEraReferenceWeek: byWeeks.find((week) =>
      isWithinInterval(vibeCodingEraReferenceDate, {
        start: new Date(week.start),
        end: new Date(week.end),
      }),
    ),
    breakDropIndicator: calculateBreakDrop(rawSortedData),
    latestDownloads: rawSortedData.at(-1)?.count ?? 0,
    peakDownloads: max(rawSortedData, (item) => item.count)?.count || 0,
  };
};

const toChange = (
  recent?: PeriodStat,
  previous?: PeriodStat,
): StatChange | null => {
  if (!recent || !previous) return null;
  return {
    nominal: recent.count - previous.count,
    percentage: getPercentChange(recent.count, previous.count),
  };
};

describe("buildProjectStats", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it.each(FIXTURES)(
    "matches the current derived stats for the $name fixture",
    ({ name, series }) => {
      const rawSortedData = expand(series);

      const stats = buildProjectStats(name, series);
      const { projectName, groupedByWeekData, summary } = stats;
      const matrix = getStatsMatrix([buildSuccessQuery(stats)]);
      const row = matrix.stats[0]!;

      expect(projectName).toBe(name);
      expect(groupedByWeekData).toEqual(
        groupByWeeks(rawSortedData).slice(0, -1),
      );
      expect(summary).toEqual(legacySummary(rawSortedData));
      expect(row).toEqual({
        projectName: name,
        color: row.color,
        weeklyChange: toChange(
          summary.recentFullWeek,
          summary.previousFullWeek,
        ),
        monthlyChange: toChange(
          summary.recentFullMonth,
          summary.previousFullMonth,
        ),
        yearlyChange: toChange(
          summary.recentFullYear,
          summary.previousFullYear,
        ),
        yoyWeekChange: toChange(
          summary.recentFullWeek,
          summary.lastYearsReferenceWeek,
        ),
        yoyMonthChange: toChange(
          summary.recentFullMonth,
          summary.lastYearsReferenceMonth,
        ),
        vibeCodingEraChange: toChange(
          summary.recentFullWeek,
          summary.vibeCodingEraReferenceWeek,
        ),
        breakDropIndicator: summary.breakDropIndicator,
      });

      if (matrix.dates.recentFullWeek === undefined) {
        return;
      }
      expect(matrix.dates).toEqual({
        recentFullWeek: summary.recentFullWeek,
        previousFullWeek: summary.previousFullWeek,
        recentFullMonth: summary.recentFullMonth,
        previousFullMonth: summary.previousFullMonth,
        recentFullYear: summary.recentFullYear,
        previousFullYear: summary.previousFullYear,
        lastYearsReferenceWeek: summary.lastYearsReferenceWeek,
        lastYearsReferenceMonth: summary.lastYearsReferenceMonth,
        vibeCodingEraReferenceWeek: summary.vibeCodingEraReferenceWeek,
      });
    },
  );

  it("detects the christmas drop for the christmas-window fixture", () => {
    const { summary } = buildProjectStats("xmas", FIXTURES[0].series);

    expect(summary.breakDropIndicator.hasEnoughData).toBe(true);
    expect(summary.breakDropIndicator.christmasDropPercentage).toBeGreaterThan(
      0,
    );
    expect(summary.lastYearsReferenceWeek).toBeDefined();
    expect(summary.lastYearsReferenceMonth).toBeDefined();
    expect(summary.vibeCodingEraReferenceWeek).toEqual({
      start: "2025-03-17",
      end: "2025-03-23",
      count: expect.any(Number),
    });
  });

  it("reports insufficient data for the short and low-average fixtures", () => {
    const short = buildProjectStats("short", FIXTURES[1].series);
    const low = buildProjectStats("low", FIXTURES[2].series);

    expect(short.summary.breakDropIndicator.hasEnoughData).toBe(false);
    expect(short.summary.previousFullYear).toBeUndefined();
    expect(low.summary.breakDropIndicator.hasEnoughData).toBe(false);
  });

  it("returns empty periods and zero downloads for an empty series", () => {
    const { groupedByWeekData, summary } = buildProjectStats("empty", {
      start: "2026-01-01",
      counts: [],
    });

    expect(groupedByWeekData).toEqual([]);
    expect(summary).toMatchObject({
      recentFullWeek: undefined,
      lastYearsReferenceWeek: undefined,
      vibeCodingEraReferenceWeek: undefined,
      latestDownloads: 0,
      peakDownloads: 0,
    });
  });

  it("skips periods starting after the provided date", () => {
    const { summary } = buildProjectStats(
      "future",
      makeSeries("2026-01-01", 20, () => 1),
      new Date(2026, 0, 10, 12),
    );

    expect(summary.recentFullWeek).toEqual({
      start: "2025-12-29",
      end: "2026-01-04",
      count: 3,
    });
    expect(summary.previousFullWeek).toBeUndefined();
  });
});

describe("buildProjectStats with gaps", () => {
  it("treats null days as missing data instead of zero downloads", () => {
    const gapSeries: CompactSeries = {
      start: "2026-01-05",
      counts: [10, 20, null, null, 30, 40, 50, 60, null],
    };

    const { groupedByWeekData, summary } = buildProjectStats(
      "gappy",
      gapSeries,
      new Date(2026, 0, 20, 12),
    );

    expect(summary.latestDownloads).toBe(60);
    expect(summary.peakDownloads).toBe(60);
    expect(groupedByWeekData.map(({ count }) => count)).toEqual([100]);
  });

  it("keeps zero-download days as data", () => {
    const { summary } = buildProjectStats(
      "zeros",
      { start: "2026-01-05", counts: [5, 0, 0] },
      new Date(2026, 0, 20, 12),
    );

    expect(summary.latestDownloads).toBe(0);
    expect(summary.peakDownloads).toBe(5);
  });
});
