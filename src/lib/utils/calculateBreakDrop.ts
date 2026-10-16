import { formatDate } from "@/app/(home)/utils/date-utils";
import { isWeekend, isWithinIsoRange, weekdayOf } from "@/lib/stats/isoDay";
import { addBusinessDays, isBefore, subBusinessDays } from "date-fns";
import { DownloadStat } from "./groupByPeriod";
import { average, sum } from "./math";

export const INSUFFICIENT_DATA_THRESHOLD = 5000;

export type BreakDropIndicator = {
  christmasDropPercentage: number | null;
  weekendDropPercentage: number;
  corporateUsageScore: number | null;
  corporateUsageLevel:
    "very_high" | "high" | "moderate" | "low" | "very_low" | null;
  hasEnoughData: boolean;
};

export const getLast5ChristmasYears = (today = new Date()) => {
  const currentYear = today.getFullYear();
  const christmasEveThisYear = new Date(currentYear, 11, 24);

  const isBeforeChristmas = isBefore(today, christmasEveThisYear);

  return Array.from({ length: 5 }, (_, i) => {
    if (isBeforeChristmas) {
      return currentYear - 1 - i;
    }
    return currentYear - i;
  });
};

const LAST_DAYS_WINDOW = 365;
const BASELINE_BUSINESS_DAYS = 30;
const CHRISTMAS_START_MONTH_DAY = "12-21";
const CHRISTMAS_END_MONTH_DAY = "12-29";

const INSUFFICIENT_BREAK_DROP = {
  christmasDropPercentage: 0,
  weekendDropPercentage: 0,
  corporateUsageScore: 0,
  corporateUsageLevel: "very_low",
  hasEnoughData: false,
} as const satisfies BreakDropIndicator;

const isChristmasMonthDay = (isoDate: string) =>
  isWithinIsoRange(
    isoDate.slice(5, 10),
    CHRISTMAS_START_MONTH_DAY,
    CHRISTMAS_END_MONTH_DAY,
  );

const createYearAccumulator = (year: number) => ({
  year,
  sum: 0,
  count: 0,
  christmasMin: Infinity,
  christmasCount: 0,
  baselineSum: 0,
  baselineCount: 0,
  baselineBeforeStart: formatDate(
    subBusinessDays(new Date(year, 11, 21), BASELINE_BUSINESS_DAYS),
  ),
  baselineBeforeEnd: `${year}-12-20`,
  baselineAfterStart: `${year}-12-30`,
  baselineAfterEnd: formatDate(
    addBusinessDays(new Date(year, 11, 29), BASELINE_BUSINESS_DAYS),
  ),
});

type YearAccumulator = ReturnType<typeof createYearAccumulator>;

const createWindowAccumulator = () => ({
  sum: 0,
  count: 0,
  weekdaySum: 0,
  weekdayCount: 0,
  weekendSum: 0,
  weekendCount: 0,
});

type WindowAccumulator = ReturnType<typeof createWindowAccumulator>;

const isInBaseline = (accumulator: YearAccumulator, isoDate: string) =>
  isWithinIsoRange(
    isoDate,
    accumulator.baselineBeforeStart,
    accumulator.baselineBeforeEnd,
  ) ||
  isWithinIsoRange(
    isoDate,
    accumulator.baselineAfterStart,
    accumulator.baselineAfterEnd,
  );

const addToYear = (
  accumulator: YearAccumulator,
  isoDate: string,
  count: number,
  weekday: number,
) => {
  accumulator.sum += count;
  accumulator.count += 1;
  if (isChristmasMonthDay(isoDate)) {
    accumulator.christmasMin = Math.min(accumulator.christmasMin, count);
    accumulator.christmasCount += 1;
    return;
  }
  if (isWeekend(weekday) || !isInBaseline(accumulator, isoDate)) {
    return;
  }
  accumulator.baselineSum += count;
  accumulator.baselineCount += 1;
};

const addToWindow = (
  accumulator: WindowAccumulator,
  isoDate: string,
  count: number,
  weekday: number,
) => {
  accumulator.sum += count;
  accumulator.count += 1;
  if (isChristmasMonthDay(isoDate)) {
    return;
  }
  if (isWeekend(weekday)) {
    accumulator.weekendSum += count;
    accumulator.weekendCount += 1;
    return;
  }
  accumulator.weekdaySum += count;
  accumulator.weekdayCount += 1;
};

const calculateChristmasDropForYear = ({
  christmasMin,
  christmasCount,
  baselineSum,
  baselineCount,
}: YearAccumulator) => {
  if (christmasMin === 0) return 0;
  if (christmasCount === 0 || baselineCount === 0) return 0;

  const baselineAverage = baselineSum / baselineCount;
  if (baselineAverage === 0) return 0;

  const dropPercentage =
    ((baselineAverage - christmasMin) / baselineAverage) * 100;

  return Math.max(0, dropPercentage);
};

const calculateWeekendDrop = ({
  weekdaySum,
  weekdayCount,
  weekendSum,
  weekendCount,
}: WindowAccumulator) => {
  if (weekdayCount === 0 || weekendCount === 0) {
    return 0;
  }

  const weekdayAverage = weekdaySum / weekdayCount;
  const weekendAverage = weekendSum / weekendCount;

  if (weekdayAverage === 0) {
    return 0;
  }

  const dropPercentage =
    ((weekdayAverage - weekendAverage) / weekdayAverage) * 100;

  return Math.max(0, dropPercentage);
};

const summarizeBreakDrop = (
  window: WindowAccumulator,
  years: YearAccumulator[],
): BreakDropIndicator => {
  if (
    window.count < LAST_DAYS_WINDOW ||
    window.sum / window.count < INSUFFICIENT_DATA_THRESHOLD
  ) {
    return { ...INSUFFICIENT_BREAK_DROP };
  }

  const onlySufficientFromLast5Years = years.filter(
    (item) => item.sum / item.count > INSUFFICIENT_DATA_THRESHOLD,
  );
  const last5YearsAverageChristmasDrop = average(
    onlySufficientFromLast5Years,
    calculateChristmasDropForYear,
  );

  const weekendDropPercentage = calculateWeekendDrop(window);

  const isChristmasInsufficient = isNaN(last5YearsAverageChristmasDrop);

  const data: { value: number; wage: number }[] = [
    { value: last5YearsAverageChristmasDrop, wage: 1 },
    { value: weekendDropPercentage, wage: 1.5 },
  ];

  const corporateUsageScore = isChristmasInsufficient
    ? weekendDropPercentage
    : sum(data, (item) => item.value * item.wage) /
      sum(data, (item) => item.wage);

  const corporateUsageLevel = determineCorporateUsageLevel(corporateUsageScore);

  return {
    christmasDropPercentage: isChristmasInsufficient
      ? null
      : last5YearsAverageChristmasDrop,
    weekendDropPercentage,
    corporateUsageScore,
    corporateUsageLevel,
    hasEnoughData: true,
  };
};

export function createBreakDropAccumulator(length: number, today = new Date()) {
  const windowStart = Math.max(0, length - LAST_DAYS_WINDOW);
  const window = createWindowAccumulator();
  const years = getLast5ChristmasYears(today).map(createYearAccumulator);
  const yearsByKey = new Map(
    years.map((accumulator) => [String(accumulator.year), accumulator]),
  );

  const add = (
    index: number,
    isoDate: string,
    count: number,
    weekday = weekdayOf(isoDate),
  ) => {
    if (index >= windowStart) {
      addToWindow(window, isoDate, count, weekday);
    }
    const yearAccumulator = yearsByKey.get(isoDate.slice(0, 4));
    if (yearAccumulator) {
      addToYear(yearAccumulator, isoDate, count, weekday);
    }
  };

  const result = () => summarizeBreakDrop(window, years);

  return { add, result };
}

export function calculateBreakDrop(
  rawData: DownloadStat[],
  today = new Date(),
): BreakDropIndicator {
  const accumulator = createBreakDropAccumulator(rawData.length, today);
  rawData.forEach(({ date, count }, index) =>
    accumulator.add(index, date, count),
  );
  return accumulator.result();
}

function determineCorporateUsageLevel(
  score: number | null,
): "very_high" | "high" | "moderate" | "low" | "very_low" | null {
  if (score === null) return null;
  if (score >= 80) return "very_high";
  if (score >= 70) return "high";
  if (score >= 60) return "moderate";
  if (score >= 50) return "low";
  return "very_low";
}
