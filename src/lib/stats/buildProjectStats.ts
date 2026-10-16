import type { CompactSeries } from "@/lib/utils/compactSeries";
import { formatDate } from "@/app/(home)/utils/date-utils";
import { VIBE_CODING_ERA_REFERENCE_DATE } from "@/lib/config/constants";
import {
  BreakDropIndicator,
  createBreakDropAccumulator,
} from "@/lib/utils/calculateBreakDrop";
import {
  createPeriodAccumulator,
  MONTH_BUCKETING,
  PeriodStat,
  WEEK_BUCKETING,
  YEAR_BUCKETING,
} from "@/lib/utils/groupByPeriod";
import {
  fromDayNumber,
  isWithinIsoRange,
  subtractIsoYear,
  toDayNumber,
  weekdayOfDayNumber,
} from "./isoDay";

export type ProjectStatsSummary = {
  recentFullWeek: PeriodStat | undefined;
  previousFullWeek: PeriodStat | undefined;
  recentFullMonth: PeriodStat | undefined;
  previousFullMonth: PeriodStat | undefined;
  recentFullYear: PeriodStat | undefined;
  previousFullYear: PeriodStat | undefined;
  lastYearsReferenceWeek: PeriodStat | undefined;
  lastYearsReferenceMonth: PeriodStat | undefined;
  vibeCodingEraReferenceWeek: PeriodStat | undefined;
  breakDropIndicator: BreakDropIndicator;
  latestDownloads: number;
  peakDownloads: number;
};

const DAYS_PER_WEEK = 7;

const containsDate = (isoDate: string) => (period: PeriodStat) =>
  isWithinIsoRange(isoDate, period.start, period.end);

const findLastContaining = (periods: PeriodStat[], isoDate?: string) => {
  if (!isoDate) return undefined;
  return periods.findLast(containsDate(isoDate));
};

const findLastYearsReference = (
  periods: PeriodStat[],
  recent: PeriodStat | undefined,
) => findLastContaining(periods, recent && subtractIsoYear(recent.end));

const toPeak = (peak: number, count: number) => (count > peak ? count : peak);

const isPresentCount = (count: number | null) => count !== null;

const accumulateSeries = ({ start, counts }: CompactSeries, now: Date) => {
  const today = formatDate(now);
  const weeks = createPeriodAccumulator(WEEK_BUCKETING, today);
  const months = createPeriodAccumulator(MONTH_BUCKETING, today);
  const years = createPeriodAccumulator(YEAR_BUCKETING, today);
  const breakDrop = createBreakDropAccumulator(counts.length, now);
  const startDayNumber = toDayNumber(start);
  const startWeekday = weekdayOfDayNumber(startDayNumber);

  counts.forEach((count, index) => {
    if (count === null) return;
    const isoDate = fromDayNumber(startDayNumber + index);
    weeks.add(isoDate, count);
    months.add(isoDate, count);
    years.add(isoDate, count);
    breakDrop.add(
      index,
      isoDate,
      count,
      (startWeekday + index) % DAYS_PER_WEEK,
    );
  });

  return {
    byWeeks: weeks.values(),
    byMonths: months.values(),
    byYears: years.values(),
    breakDropIndicator: breakDrop.result(),
  };
};

const summarizePeriods = (
  byWeeks: PeriodStat[],
  byMonths: PeriodStat[],
  byYears: PeriodStat[],
) => {
  const recentFullWeek = byWeeks.at(-2);
  const recentFullMonth = byMonths.at(-2);

  return {
    recentFullWeek,
    previousFullWeek: byWeeks.at(-3),
    recentFullMonth,
    previousFullMonth: byMonths.at(-3),
    recentFullYear: byYears.at(-2),
    previousFullYear: byYears.at(-3),
    lastYearsReferenceWeek: findLastYearsReference(byWeeks, recentFullWeek),
    lastYearsReferenceMonth: findLastYearsReference(byMonths, recentFullMonth),
    vibeCodingEraReferenceWeek: byWeeks.find(
      containsDate(VIBE_CODING_ERA_REFERENCE_DATE),
    ),
  };
};

export function buildProjectStats(
  projectName: string,
  series: CompactSeries,
  now = new Date(),
) {
  const { byWeeks, byMonths, byYears, breakDropIndicator } = accumulateSeries(
    series,
    now,
  );

  const presentCounts = series.counts.filter(isPresentCount);

  const summary: ProjectStatsSummary = {
    ...summarizePeriods(byWeeks, byMonths, byYears),
    breakDropIndicator,
    latestDownloads: presentCounts.at(-1) ?? 0,
    peakDownloads: presentCounts.reduce(toPeak, 0),
  };

  return {
    projectName,
    groupedByWeekData: byWeeks.slice(0, -1),
    summary,
  };
}
