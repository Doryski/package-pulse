import { formatDate, startOfWeek } from "@/app/(home)/utils/date-utils";
import { buildProjectStats } from "@/lib/stats/buildProjectStats";
import { fromDayNumber, toDayNumber } from "@/lib/stats/isoDay";
import type { CompactSeries } from "@/lib/utils/compactSeries";
import {
  BreakDropIndicator,
  calculateBreakDrop,
  getLast5ChristmasYears,
  INSUFFICIENT_DATA_THRESHOLD,
} from "@/lib/utils/calculateBreakDrop";
import groupByPeriod, {
  DownloadStat,
  groupStats,
} from "@/lib/utils/groupByPeriod";
import { average, sum } from "@/lib/utils/math";
import { isDeepStrictEqual } from "node:util";
import {
  addBusinessDays,
  addDays,
  addMonths,
  addWeeks,
  addYears,
  differenceInCalendarDays,
  differenceInCalendarMonths,
  differenceInCalendarWeeks,
  differenceInCalendarYears,
  endOfYear,
  isWithinInterval,
  parseISO,
  startOfMonth,
  startOfYear,
  subBusinessDays,
} from "date-fns";

const SERIES_START = "2015-01-10";
const SERIES_DAYS = 4_296;
const WARMUP_RUNS = 3;
const MEASURED_RUNS = 15;
const BUDGET_MS = 20;

const syntheticCount = (index: number) =>
  20_000 + Math.round(15_000 * Math.sin(index / 9)) + index * 37;

const SERIES: CompactSeries = {
  start: SERIES_START,
  counts: Array.from({ length: SERIES_DAYS }, (_, index) =>
    syntheticCount(index),
  ),
};

const RAW: DownloadStat[] = SERIES.counts.map((count, index) => ({
  date: fromDayNumber(toDayNumber(SERIES_START) + index),
  count: count ?? 0,
}));

const legacyGroupStats = (stats: DownloadStat[]) => ({
  byDays: groupByPeriod(stats, 1, addDays, differenceInCalendarDays),
  byThreeDays: groupByPeriod(stats, 3, addDays, differenceInCalendarDays),
  byWeeks: groupByPeriod(stats, 1, addWeeks, differenceInCalendarWeeks, (d) =>
    startOfWeek(d),
  ),
  byMonths: groupByPeriod(
    stats,
    1,
    addMonths,
    differenceInCalendarMonths,
    startOfMonth,
  ),
  byYears: groupByPeriod(
    stats,
    1,
    addYears,
    differenceInCalendarYears,
    startOfYear,
  ),
});

const inRange = (item: DownloadStat, start: Date, end: Date) =>
  isWithinInterval(parseISO(item.date), { start, end });

const legacyIsWeekday = (item: DownloadStat) => {
  const day = parseISO(item.date).getDay();
  return day !== 0 && day !== 6;
};

const legacyChristmasDrop = (data: DownloadStat[], year: number) => {
  const christmasStart = new Date(year, 11, 21);
  const christmasEnd = new Date(year, 11, 29);
  const christmasData = data.filter((item) =>
    inRange(item, christmasStart, christmasEnd),
  );
  const christmasMin = Math.min(...christmasData.map((item) => item.count));
  if (christmasMin === 0) return 0;
  const baselineData = data.filter(
    (item) =>
      (inRange(
        item,
        subBusinessDays(christmasStart, 30),
        new Date(year, 11, 20),
      ) ||
        inRange(
          item,
          new Date(year, 11, 30),
          addBusinessDays(christmasEnd, 30),
        )) &&
      legacyIsWeekday(item),
  );
  if (christmasData.length === 0 || baselineData.length === 0) return 0;
  const baselineAverage = average(baselineData, (item) => item.count);
  if (baselineAverage === 0) return 0;
  return Math.max(
    0,
    ((baselineAverage - christmasMin) / baselineAverage) * 100,
  );
};

const legacyWeekendDrop = (data: DownloadStat[]) => {
  const weekday = data.filter(legacyIsWeekday).map((item) => item.count);
  const weekend = data
    .filter((item) => !legacyIsWeekday(item))
    .map((item) => item.count);
  if (weekday.length === 0 || weekend.length === 0) return 0;
  const weekdayAverage = average(weekday, (item) => item);
  if (weekdayAverage === 0) return 0;
  const weekendAverage = average(weekend, (item) => item);
  return Math.max(
    0,
    ((weekdayAverage - weekendAverage) / weekdayAverage) * 100,
  );
};

const legacyLevel = (
  score: number,
): BreakDropIndicator["corporateUsageLevel"] => {
  if (score >= 80) return "very_high";
  if (score >= 70) return "high";
  if (score >= 60) return "moderate";
  if (score >= 50) return "low";
  return "very_low";
};

const legacyBreakDrop = (rawData: DownloadStat[]): BreakDropIndicator => {
  const last365Days = rawData.slice(-365);
  if (
    last365Days.length < 365 ||
    average(last365Days, (item) => item.count) < INSUFFICIENT_DATA_THRESHOLD
  ) {
    return {
      christmasDropPercentage: 0,
      weekendDropPercentage: 0,
      corporateUsageScore: 0,
      corporateUsageLevel: "very_low",
      hasEnoughData: false,
    };
  }
  const sufficientYears = getLast5ChristmasYears()
    .map((year) => {
      const yearStart = startOfYear(new Date(year, 0, 1));
      const data = rawData.filter((item) =>
        inRange(item, yearStart, endOfYear(yearStart)),
      );
      return { year, data, average: average(data, (item) => item.count) };
    })
    .filter((item) => item.average > INSUFFICIENT_DATA_THRESHOLD);
  const christmasDrop = average(sufficientYears, (item) =>
    legacyChristmasDrop(item.data, item.year),
  );
  const weekendDropPercentage = legacyWeekendDrop(
    last365Days.filter((item) => {
      const date = parseISO(item.date);
      return !inRange(
        item,
        new Date(date.getFullYear(), 11, 21),
        new Date(date.getFullYear(), 11, 29),
      );
    }),
  );
  const isChristmasInsufficient = isNaN(christmasDrop);
  const data = [
    { value: christmasDrop, wage: 1 },
    { value: weekendDropPercentage, wage: 1.5 },
  ];
  const corporateUsageScore = isChristmasInsufficient
    ? weekendDropPercentage
    : sum(data, (item) => item.value * item.wage) /
      sum(data, (item) => item.wage);
  return {
    christmasDropPercentage: isChristmasInsufficient ? null : christmasDrop,
    weekendDropPercentage,
    corporateUsageScore,
    corporateUsageLevel: legacyLevel(corporateUsageScore),
    hasEnoughData: true,
  };
};

const median = (values: number[]) => {
  const sorted = values.toSorted((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)] ?? 0;
};

const measure = (run: () => unknown) => {
  Array.from({ length: WARMUP_RUNS }, run);
  const samples = Array.from({ length: MEASURED_RUNS }, () => {
    const startedAt = performance.now();
    run();
    return performance.now() - startedAt;
  });
  return median(samples);
};

const toParity = (isEqual: boolean) => (isEqual ? "PASS" : "FAIL");

const checkParity = () => {
  const legacyGroups = legacyGroupStats(RAW);
  const newGroups = groupStats(RAW);
  const built = buildProjectStats("bench", SERIES);
  const legacyIndicator = legacyBreakDrop(RAW);
  return [
    [
      "groupStats weeks/months/years",
      toParity(
        isDeepStrictEqual(
          {
            byWeeks: legacyGroups.byWeeks,
            byMonths: legacyGroups.byMonths,
            byYears: legacyGroups.byYears,
          },
          newGroups,
        ),
      ),
    ],
    [
      "calculateBreakDrop",
      toParity(isDeepStrictEqual(legacyIndicator, calculateBreakDrop(RAW))),
    ],
    [
      "buildProjectStats weeks",
      toParity(
        isDeepStrictEqual(
          legacyGroups.byWeeks.slice(0, -1),
          built.groupedByWeekData,
        ),
      ),
    ],
    [
      "buildProjectStats breakDrop",
      toParity(
        isDeepStrictEqual(legacyIndicator, built.summary.breakDropIndicator),
      ),
    ],
    [
      "buildProjectStats month/year",
      toParity(
        isDeepStrictEqual(
          [legacyGroups.byMonths.at(-2), legacyGroups.byYears.at(-3)],
          [built.summary.recentFullMonth, built.summary.previousFullYear],
        ),
      ),
    ],
  ] as const;
};

const main = () => {
  const today = formatDate(new Date());
  const timings = [
    ["legacy groupStats", measure(() => legacyGroupStats(RAW))],
    ["legacy calculateBreakDrop", measure(() => legacyBreakDrop(RAW))],
    ["new groupStats", measure(() => groupStats(RAW))],
    ["new calculateBreakDrop", measure(() => calculateBreakDrop(RAW))],
    ["buildProjectStats", measure(() => buildProjectStats("bench", SERIES))],
  ] as const;

  console.info(
    `Synthetic package: ${SERIES_DAYS} days from ${SERIES_START} (today ${today}), median of ${MEASURED_RUNS} runs`,
  );
  console.table(
    timings.map(([label, ms]) => ({
      step: label,
      "ms/package": ms.toFixed(2),
    })),
  );
  console.table(checkParity().map(([check, result]) => ({ check, result })));

  const buildMs = timings.at(-1)?.[1] ?? Infinity;
  const verdict = buildMs <= BUDGET_MS ? "PASS" : "FAIL";
  console.info(
    `Budget ${BUDGET_MS} ms/package: ${verdict} (${buildMs.toFixed(2)} ms)`,
  );
};

main();
