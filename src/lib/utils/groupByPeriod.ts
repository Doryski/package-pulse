import { formatDate } from "@/app/(home)/utils/date-utils";
import {
  daysInMonth,
  fromDayNumber,
  toDayNumber,
  weekdayOfDayNumber,
} from "@/lib/stats/isoDay";
import { subDays } from "date-fns";
import AppError from "./AppError";
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

type PeriodBucketing<K> = {
  keyOf: (isoDate: string) => K;
  boundsOf: (key: K) => Period;
};

const weekStartDayNumber = (isoDate: string) => {
  const dayNumber = toDayNumber(isoDate);
  return dayNumber - weekdayOfDayNumber(dayNumber) + 1;
};

export const WEEK_BUCKETING: PeriodBucketing<number> = {
  keyOf: weekStartDayNumber,
  boundsOf: (startDayNumber) => ({
    start: fromDayNumber(startDayNumber),
    end: fromDayNumber(startDayNumber + 6),
  }),
};

export const MONTH_BUCKETING: PeriodBucketing<string> = {
  keyOf: (isoDate) => isoDate.slice(0, 7),
  boundsOf: (isoMonth) => ({
    start: `${isoMonth}-01`,
    end: `${isoMonth}-${daysInMonth(isoMonth)}`,
  }),
};

export const YEAR_BUCKETING: PeriodBucketing<string> = {
  keyOf: (isoDate) => isoDate.slice(0, 4),
  boundsOf: (isoYear) => ({
    start: `${isoYear}-01-01`,
    end: `${isoYear}-12-31`,
  }),
};

export function createPeriodAccumulator<K>(
  { keyOf, boundsOf }: PeriodBucketing<K>,
  today = formatDate(new Date()),
) {
  const grouped = new Map<K, PeriodStat>();

  const add = (isoDate: string, count: number) => {
    const key = keyOf(isoDate);
    const existing = grouped.get(key);
    if (existing) {
      existing.count += count;
      return;
    }
    const bounds = boundsOf(key);
    if (bounds.start > today) {
      return;
    }
    grouped.set(key, { ...bounds, count: 0 + count });
  };

  const values = () => [...grouped.values()];

  return { add, values };
}

const groupByBucketing = <K>(
  stats: DownloadStat[],
  bucketing: PeriodBucketing<K>,
) => {
  const accumulator = createPeriodAccumulator(bucketing);
  stats.forEach(({ date, count }) => accumulator.add(date, count));
  return accumulator.values();
};

export const groupByWeeks = (stats: DownloadStat[]) =>
  groupByBucketing(stats, WEEK_BUCKETING);

export const groupByMonths = (stats: DownloadStat[]) =>
  groupByBucketing(stats, MONTH_BUCKETING);

export const groupByYears = (stats: DownloadStat[]) =>
  groupByBucketing(stats, YEAR_BUCKETING);

export function groupStats(stats: DownloadStat[]) {
  return {
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
    throw new AppError("Invalid date format");
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
  const todayUTC = formatDate(new Date());

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
      const periodStart = formatDate(periodStartDate);
      const periodEnd = formatDate(periodEndDate);

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
