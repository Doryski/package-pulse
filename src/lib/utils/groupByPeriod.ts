import {
  addDays,
  addMonths,
  addWeeks,
  differenceInCalendarDays,
  differenceInCalendarMonths,
  differenceInCalendarWeeks,
  format,
  startOfMonth,
  startOfWeek,
} from "date-fns";

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

export function groupStats<
  T extends {
    date: string;
    count: number;
  },
>(stats: T[]) {
  return {
    byDay: stats,
    byThreeDays: groupByPeriod(stats, 3, addDays, differenceInCalendarDays),
    byWeeks: groupByWeeks(stats),
    byMonths: groupByPeriod(
      stats,
      1,
      addMonths,
      differenceInCalendarMonths,
      startOfMonth,
    ),
  };
}

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
  const grouped: Record<string, { date: string; count: number }> = {};

  stats.forEach(({ date, count }) => {
    const currentDate = new Date(date);
    const startPeriodDate = startOfPeriodFn(currentDate);
    const periodStartDate = addPeriodFn(
      startPeriodDate,
      Math.floor(differenceFn(currentDate, startPeriodDate) / periodLength) *
        periodLength,
    );

    const periodKey = format(periodStartDate, "yyyy-MM-dd");

    if (!grouped[periodKey]) {
      grouped[periodKey] = { date: periodKey, count: 0 };
    }

    grouped[periodKey].count += count;
  });

  return Object.values(grouped);
}
