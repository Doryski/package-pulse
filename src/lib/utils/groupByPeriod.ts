import {
  addDays,
  addMonths,
  addWeeks,
  addYears,
  differenceInCalendarDays,
  differenceInCalendarMonths,
  differenceInCalendarWeeks,
  differenceInCalendarYears,
  format,
  startOfMonth,
  startOfWeek,
  startOfYear,
} from "date-fns";

export function groupByDays<
  T extends {
    date: string;
    count: number;
  },
>(stats: T[], periodLength: number) {
  return groupByPeriod(stats, periodLength, addDays, differenceInCalendarDays);
}

export function groupByWeeks<
  T extends {
    date: string;
    count: number;
  }[],
>(stats: T) {
  return groupByPeriod(
    stats,
    1,
    addWeeks,
    differenceInCalendarWeeks,
    startOfWeek,
  );
}

export function groupByMonths<
  T extends {
    date: string;
    count: number;
  },
>(stats: T[]) {
  return groupByPeriod(
    stats,
    1,
    addMonths,
    differenceInCalendarMonths,
    startOfMonth,
  );
}

export function groupByYears<
  T extends {
    date: string;
    count: number;
  },
>(stats: T[]) {
  return groupByPeriod(
    stats,
    1,
    addYears,
    differenceInCalendarYears,
    startOfYear,
  );
}

export function groupStats<
  T extends {
    date: string;
    count: number;
  },
>(stats: T[]) {
  return {
    byDays: groupByDays(stats, 1),
    byThreeDays: groupByDays(stats, 3),
    byWeeks: groupByWeeks(stats),
    byMonths: groupByMonths(stats),
    byYears: groupByYears(stats),
  };
}

export const calculatePeriodStartDate = (
  date: string,
  periodLength: number,
  startOfPeriodFn: (date: Date) => Date,
  differenceFn: (dateLeft: Date, dateRight: Date) => number,
  addPeriodFn: (date: Date, periodLength: number) => Date,
): Date => {
  const currentDate = new Date(date);
  const startPeriodDate = startOfPeriodFn(currentDate);
  const periodDifference = differenceFn(currentDate, startPeriodDate);
  const periodsToAdd = Math.floor(periodDifference / periodLength);
  return addPeriodFn(startPeriodDate, periodsToAdd * periodLength);
};

export const updateGroupedStats = (
  grouped: Record<string, { date: string; count: number }>,
  periodKey: string,
  count: number,
): void => {
  if (!grouped[periodKey]) {
    grouped[periodKey] = { date: periodKey, count: 0 };
  }
  grouped[periodKey].count += count;
};

export default function groupByPeriod<
  T extends {
    date: string;
    count: number;
  },
>(
  stats: T[],
  periodLength: number,
  addPeriodFn: (date: Date, periodLength: number) => Date,
  differenceFn: (dateLeft: Date, dateRight: Date) => number,
  startOfPeriodFn: (date: Date) => Date = (date) => date,
) {
  return Object.values(
    stats.reduce<Record<string, { date: string; count: number }>>(
      (grouped, { date, count }) => {
        const periodStartDate = calculatePeriodStartDate(
          date,
          periodLength,
          startOfPeriodFn,
          differenceFn,
          addPeriodFn,
        );

        const periodKey = format(periodStartDate, "yyyy-MM-dd");
        updateGroupedStats(grouped, periodKey, count);
        return grouped;
      },
      {},
    ),
  );
}
