import {
  addBusinessDays,
  endOfYear,
  isBefore,
  isWithinInterval,
  parseISO,
  startOfYear,
  subBusinessDays,
} from "date-fns";
import { DownloadStat } from "./groupByPeriod";
import { average, sum } from "./math";

const INSUFFICIENT_DATA_THRESHOLD = 5000;

export type BreakDropIndicator = {
  christmasDropPercentage: number;
  weekendDropPercentage: number;
  corporateUsageScore: number;
  corporateUsageLevel: "very_high" | "high" | "moderate" | "low" | "very_low";
  hasEnoughData: boolean;
};

export const getLast5ChristmasYears = () => {
  const today = new Date();
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

export function calculateBreakDrop(
  rawData: DownloadStat[],
): BreakDropIndicator {
  const last365Days = rawData.slice(-365);
  const last365DaysAverage = average(last365Days, (item) => item.count);

  if (
    last365Days.length < 365 ||
    last365DaysAverage < INSUFFICIENT_DATA_THRESHOLD
  ) {
    return {
      christmasDropPercentage: 0,
      weekendDropPercentage: 0,
      corporateUsageScore: 0,
      corporateUsageLevel: "very_low",
      hasEnoughData: false,
    };
  }

  const last5Years = getLast5ChristmasYears();
  const dataPerYear = last5Years.map((year) => {
    const data = rawData.filter((item) => {
      const date = parseISO(item.date);
      return isWithinInterval(date, {
        start: startOfYear(new Date(year, 0, 1)),
        end: endOfYear(new Date(year, 0, 1)),
      });
    });
    return { year, data, average: average(data, (item) => item.count) };
  });

  const onlySufficientFromLast5Years = dataPerYear.filter(
    (item) => item.average > INSUFFICIENT_DATA_THRESHOLD,
  );

  const last5YearsAverageChristmasDrop = average(
    onlySufficientFromLast5Years,
    (item) => calculateChristmasDropForYear(item.data, item.year),
  );
  if (isNaN(last5YearsAverageChristmasDrop)) {
    return {
      christmasDropPercentage: 0,
      weekendDropPercentage: 0,
      corporateUsageScore: 0,
      corporateUsageLevel: "very_low",
      hasEnoughData: false,
    };
  }

  const last365DaysDataExcludingChristmas = last365Days.filter((item) => {
    const date = parseISO(item.date);
    return !isWithinInterval(date, {
      start: new Date(date.getFullYear(), 11, 21),
      end: new Date(date.getFullYear(), 11, 29),
    });
  });
  const weekendDropPercentage = calculateWeekendDrop(
    last365DaysDataExcludingChristmas,
  );

  const data: { value: number; wage: number }[] = [
    { value: last5YearsAverageChristmasDrop, wage: 1 },
    { value: weekendDropPercentage, wage: 1.5 },
  ];

  const corporateUsageScore =
    sum(data, (item) => item.value * item.wage) /
    sum(data, (item) => item.wage);

  const corporateUsageLevel = determineCorporateUsageLevel(corporateUsageScore);

  return {
    christmasDropPercentage: last5YearsAverageChristmasDrop,
    weekendDropPercentage,
    corporateUsageScore,
    corporateUsageLevel,
    hasEnoughData: true,
  };
}

function calculateChristmasDropForYear(
  rawData: DownloadStat[],
  year: number,
): number {
  // Christmas period: December 21-29
  const christmasStart = new Date(year, 11, 21);
  const christmasEnd = new Date(year, 11, 29);

  // Baseline period: 30 days before Christmas - 30 days after Christmas
  const baselineBeforeChristmasStart = subBusinessDays(christmasStart, 30);
  const baselineAfterChristmasEnd = addBusinessDays(christmasEnd, 30);

  const christmasData = rawData.filter((item) => {
    const date = parseISO(item.date);
    return isWithinInterval(date, {
      start: christmasStart,
      end: christmasEnd,
    });
  });
  const christmasMinValue = Math.min(
    ...christmasData.map((item) => item.count),
  );
  if (christmasMinValue === 0) return 0;

  const baselineData = rawData.filter((item) => {
    const date = parseISO(item.date);
    const isInBaselineBeforeChristmas = isWithinInterval(date, {
      start: baselineBeforeChristmasStart,
      end: christmasStart,
    });
    const isInBaselineAfterChristmas = isWithinInterval(date, {
      start: christmasEnd,
      end: baselineAfterChristmasEnd,
    });
    // Exclude weekends from baseline (Saturday = 6, Sunday = 0)
    const dayOfWeek = date.getDay();
    const isWeekday = dayOfWeek !== 0 && dayOfWeek !== 6;
    return (
      (isInBaselineBeforeChristmas || isInBaselineAfterChristmas) && isWeekday
    );
  });

  if (christmasData.length === 0 || baselineData.length === 0) return 0;

  const baselineAverage = average(baselineData, (item) => item.count);
  if (baselineAverage === 0) return 0;

  const dropPercentage =
    ((baselineAverage - christmasMinValue) / baselineAverage) * 100;

  return Math.max(0, dropPercentage);
}

function calculateWeekendDrop(rawData: DownloadStat[]): number {
  const weekdayData: number[] = [];
  const weekendData: number[] = [];

  rawData.forEach((item) => {
    const date = parseISO(item.date);
    const dayOfWeek = date.getDay();

    if (dayOfWeek === 0 || dayOfWeek === 6) {
      // Weekend (Sunday = 0, Saturday = 6)
      weekendData.push(item.count);
    } else {
      // Weekday
      weekdayData.push(item.count);
    }
  });

  if (weekdayData.length === 0 || weekendData.length === 0) {
    return 0;
  }

  const weekdayAverage = average(weekdayData, (item) => item);
  const weekendAverage = average(weekendData, (item) => item);

  if (weekdayAverage === 0) {
    return 0;
  }

  const dropPercentage =
    ((weekdayAverage - weekendAverage) / weekdayAverage) * 100;

  return Math.max(0, dropPercentage);
}

function determineCorporateUsageLevel(
  score: number,
): "very_high" | "high" | "moderate" | "low" | "very_low" {
  if (score >= 80) return "very_high";
  if (score >= 70) return "high";
  if (score >= 60) return "moderate";
  if (score >= 50) return "low";
  return "very_low";
}
