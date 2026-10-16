import { formatDate } from "@/app/(home)/utils/date-utils";
import type { ChartScale } from "@/lib/enums/ChartScale";
import type { TimePeriod } from "@/lib/enums/TimePeriod";
import assertUnreachable from "@/lib/utils/assertUnreachable";
import { formatLargeNumber } from "@/lib/utils/formatters";
import sortByVersion from "@/lib/utils/sortByVersion";
import { isAfter, subMonths, subYears } from "date-fns";
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
    versions?: VersionData[];
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

const isAfterPeriodStart = (date: Date, timePeriod: TimePeriod, now: Date) => {
  switch (timePeriod) {
    case "months-1":
      return isAfter(date, subMonths(now, 1));
    case "months-3":
      return isAfter(date, subMonths(now, 3));
    case "months-6":
      return isAfter(date, subMonths(now, 6));
    case "years-1":
      return isAfter(date, subYears(now, 1));
    case "years-2":
      return isAfter(date, subYears(now, 2));
    case "years-5":
      return isAfter(date, subYears(now, 5));
    case "all-time":
      return true;
    default:
      return assertUnreachable(timePeriod, "Invalid time period");
  }
};

export const filterByTimePeriod = (
  data: ChartData[],
  timePeriod: TimePeriod,
  now: Date,
) =>
  data.filter((item) =>
    isAfterPeriodStart(new Date(item.time), timePeriod, now),
  );

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

const getPositiveValues = (rows: ChartRow[], xKey: string) =>
  rows.flatMap((row) =>
    getValueKeys(row, xKey)
      .map((key) => row[key])
      .filter(isPositiveNumber),
  );

export const getYAxisDomain = (
  rows: ChartRow[],
  xKey: string,
  chartScale: ChartScale,
) => {
  if (chartScale !== "logarithmic") {
    return ["auto", "auto"];
  }

  const values = getPositiveValues(rows, xKey);
  if (values.length === 0) {
    return [...LOG_DOMAIN_FALLBACK];
  }

  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);

  return [Math.max(1, Math.floor(minValue * 0.9)), Math.ceil(maxValue * 1.1)];
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

export const getLatestVersion = (versions?: VersionData[]) => {
  if (!versions) return;
  return sortByVersion(versions).at(-1);
};

export const formatVersion = (version: VersionData) => {
  const formattedDate = formatDate(version.date);
  return `${version.version} (${formattedDate})`;
};

export const formatLatestVersion = (versions?: VersionData[]) => {
  const latestVersion = getLatestVersion(versions);
  if (!latestVersion) return "-";
  return formatVersion(latestVersion);
};
