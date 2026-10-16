import { WEEK_BUCKETING } from "@/lib/utils/groupByPeriod";
import { formatDate } from "@/app/(home)/utils/date-utils";
import type { ChartScale } from "@/lib/enums/ChartScale";
import type { TimePeriod } from "@/lib/enums/TimePeriod";
import assertUnreachable from "@/lib/utils/assertUnreachable";
import { formatLargeNumber } from "@/lib/utils/formatters";
import { subMonths, subYears } from "date-fns";
import type { ComponentType, ReactNode } from "react";

export type ChartData = {
  time: string | Date;
} & Record<string, number | null>;

export type NormalizedChartData = {
  weekIndex: number;
} & Record<string, number | null>;

export type ChartRow = Record<string, number | string | Date | null>;

export type VersionData = {
  version: string;
  date: string;
};

export type ChartConfig = {
  [k in string]: {
    label?: ReactNode;
    icon?: ComponentType;
    latestRelease?: VersionData | null;
  } & (
    | { color?: string; theme?: never }
    | { color?: never; theme: Record<"light" | "dark", string> }
  );
};

type LabelPayloadItem = {
  payload?: { weekIndex?: number };
};

const SHARE_TO_X_TEXT = "Compare npm package download trends on Package Pulse";

const LOG_DOMAIN_FALLBACK = [1, 100];

const getPeriodStart = (timePeriod: TimePeriod, now: Date) => {
  switch (timePeriod) {
    case "months-1":
      return subMonths(now, 1);
    case "months-3":
      return subMonths(now, 3);
    case "months-6":
      return subMonths(now, 6);
    case "years-1":
      return subYears(now, 1);
    case "years-2":
      return subYears(now, 2);
    case "years-5":
      return subYears(now, 5);
    case "all-time":
      return null;
    default:
      return assertUnreachable(timePeriod, "Invalid time period");
  }
};

const toIsoTime = (time: ChartData["time"]) =>
  typeof time === "string" ? time : time.toISOString();

export const filterByTimePeriod = (
  data: ChartData[],
  timePeriod: TimePeriod,
  now: Date,
) => {
  const periodStart = getPeriodStart(timePeriod, now);
  if (!periodStart) return data;
  const cutoff = periodStart.toISOString();
  return data.filter((item) => toIsoTime(item.time) > cutoff);
};

const getValueKeys = (row: ChartRow, xKey: string) =>
  Object.keys(row).filter((key) => key !== xKey);

export const getSeriesKeys = (rows: ChartRow[], xKey: string) => {
  const first = rows[0];
  if (!first) return [];
  return getValueKeys(first, xKey);
};

export const formatYAxisTick = (value: number, chartScale: ChartScale) => {
  if (chartScale === "logarithmic" && value <= 0) {
    return "0";
  }
  return formatLargeNumber(value);
};

const isPositiveNumber = (value: unknown): value is number =>
  typeof value === "number" && value > 0;

type ValueRange = { min: number; max: number };

const extendRange = (range: ValueRange | null, value: number) => {
  if (!range) return { min: value, max: value };
  return {
    min: Math.min(range.min, value),
    max: Math.max(range.max, value),
  };
};

const getPositiveRange = (rows: ChartRow[], xKey: string) =>
  rows.reduce<ValueRange | null>(
    (range, row) =>
      getValueKeys(row, xKey).reduce((rowRange, key) => {
        const value = row[key];
        if (!isPositiveNumber(value)) return rowRange;
        return extendRange(rowRange, value);
      }, range),
    null,
  );

export const getYAxisDomain = (
  rows: ChartRow[],
  xKey: string,
  chartScale: ChartScale,
) => {
  if (chartScale !== "logarithmic") {
    return ["auto", "auto"];
  }

  const range = getPositiveRange(rows, xKey);
  if (!range) {
    return [...LOG_DOMAIN_FALLBACK];
  }

  return [Math.max(1, Math.floor(range.min * 0.9)), Math.ceil(range.max * 1.1)];
};

export const nullifyZeroValues = (rows: ChartRow[], xKey: string) =>
  rows.map((row) =>
    Object.fromEntries(
      Object.entries(row).map(([key, value]) => [
        key,
        key !== xKey && value === 0 ? null : value,
      ]),
    ),
  );

export const buildShareToXUrl = (pageUrl: string) =>
  `https://twitter.com/intent/tweet?text=${encodeURIComponent(
    SHARE_TO_X_TEXT,
  )}&url=${encodeURIComponent(pageUrl)}`;

export const formatXAxisTick = (
  value: string | number | Date,
  isNormalized: boolean,
) => {
  if (isNormalized) return `wk ${value}`;
  return formatDate(value);
};

export const formatNormalizedLabel = (
  payload: ReadonlyArray<LabelPayloadItem> | undefined,
) => {
  const [first] = payload ?? [];
  const weekIndex = first?.payload?.weekIndex;
  return `wk ${weekIndex}`;
};

export const formatVersion = (version: VersionData) => {
  const formattedDate = formatDate(version.date);
  return `${version.version} (${formattedDate})`;
};

export const formatLatestVersion = (release?: VersionData | null) => {
  if (!release) return "-";
  return formatVersion(release);
};

const toReleaseWeekEnd = (releaseDate: string) =>
  WEEK_BUCKETING.boundsOf(WEEK_BUCKETING.keyOf(releaseDate.slice(0, 10))).end;

export const findReleaseRowKey = (
  rows: ChartRow[],
  xKey: string,
  releaseDate: string,
) => {
  const weekEnd = toReleaseWeekEnd(releaseDate);
  const hasRow = rows.some((row) => String(row[xKey]) === weekEnd);
  return hasRow ? weekEnd : null;
};
