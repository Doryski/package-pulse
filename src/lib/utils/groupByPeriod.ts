import { DATE_FORMAT } from "@/api/fetchNPMDownloads";
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
  subDays,
} from "date-fns";
import { getPeriodStartByDays } from "./getPeriodStartByDays";

export type Period = {
  start: string;
  end: string;
};

export type PeriodStat = Period & {
  count: number;
};

export type DownloadStat = {
  date: string;
  count: number;
};

export function groupByDays<T extends DownloadStat>(
  stats: T[],
  periodLength: number,
) {
  return groupByPeriod(
    stats,
    periodLength,
    addDays,
    differenceInCalendarDays,
    (date) => getPeriodStartByDays(date, periodLength),
  );
}

export function groupByWeeks<T extends DownloadStat[]>(stats: T) {
  return groupByPeriod(stats, 1, addWeeks, differenceInCalendarWeeks, (date) =>
    startOfWeek(date, { weekStartsOn: 1 }),
  );
}

export function groupByMonths<T extends DownloadStat>(stats: T[]) {
  return groupByPeriod(
    stats,
    1,
    addMonths,
    differenceInCalendarMonths,
    startOfMonth,
  );
}

export function groupByYears<T extends DownloadStat>(stats: T[]) {
  return groupByPeriod(
    stats,
    1,
    addYears,
    differenceInCalendarYears,
    startOfYear,
  );
}

export function groupStats<T extends DownloadStat>(stats: T[]) {
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
  startOfPeriodFn: (date: Date) => Date = (date) =>
    getPeriodStartByDays(date, periodLength),
  differenceFn: (dateLeft: Date, dateRight: Date) => number,
  addPeriodFn: (date: Date, periodLength: number) => Date,
): Date => {
  const currentDate = new Date(date);
  const startPeriodDate = startOfPeriodFn(currentDate);
  const periodDifference = differenceFn(currentDate, startPeriodDate);
  const periodsToAdd = Math.floor(periodDifference / periodLength);
  return addPeriodFn(startPeriodDate, periodsToAdd * periodLength);
};

export const createPeriodKey = (start: string, end: string) => {
  const dateFormatRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateFormatRegex.test(start) || !dateFormatRegex.test(end)) {
    throw new Error("Invalid date format");
  }
  return `${start}:${end}`;
};

export const calculatePeriodEndDate = (
  periodStart: Date,
  periodLength: number,
  addPeriodFn: (date: Date, periodLength: number) => Date,
): Date => {
  return subDays(addPeriodFn(periodStart, periodLength), 1);
};
export const updateGroupedStats = (
  grouped: Record<string, PeriodStat>,
  period: Period,
  count: number,
): void => {
  const periodKey = createPeriodKey(period.start, period.end);
  if (!grouped[periodKey]) {
    grouped[periodKey] = { start: period.start, end: period.end, count: 0 };
  }
  grouped[periodKey].count += count;
};

export default function groupByPeriod<T extends DownloadStat>(
  stats: T[],
  periodLength: number,
  addPeriodFn: (date: Date, periodLength: number) => Date,
  differenceFn: (dateLeft: Date, dateRight: Date) => number,
  startOfPeriodFn: (date: Date) => Date = (date) =>
    getPeriodStartByDays(date, periodLength),
) {
  const todayUTC = format(new Date(), DATE_FORMAT);

  return Object.values(
    stats.reduce<Record<string, PeriodStat>>((grouped, { date, count }) => {
      const periodStartDate = calculatePeriodStartDate(
        date,
        periodLength,
        startOfPeriodFn,
        differenceFn,
        addPeriodFn,
      );

      const periodEndDate = calculatePeriodEndDate(
        periodStartDate,
        periodLength,
        addPeriodFn,
      );
      const periodStart = format(periodStartDate, DATE_FORMAT);
      const periodEnd = format(periodEndDate, DATE_FORMAT);

      if (periodStart <= todayUTC) {
        updateGroupedStats(
          grouped,
          {
            start: periodStart,
            end: periodEnd,
          },
          count,
        );
      }

      return grouped;
    }, {}),
  );
}
