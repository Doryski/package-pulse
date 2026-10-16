import { ProjectStats } from "@/lib/queries/useProjectsStats";
import type { ProjectStatsSummary } from "@/lib/stats/buildProjectStats";
import { BreakDropIndicator } from "@/lib/utils/calculateBreakDrop";
import { getChartColorVar } from "@/lib/utils/getChartColor";
import getPercentChange from "@/lib/utils/getPercentChange";
import { PeriodStat } from "@/lib/utils/groupByPeriod";
import { UseQueryResult } from "@tanstack/react-query";

export type StatChange = {
  nominal: number;
  percentage: number;
};

export type StatsRow = {
  projectName: string;
  color: string;
  weeklyChange: StatChange | null;
  monthlyChange: StatChange | null;
  yearlyChange: StatChange | null;
  yoyWeekChange: StatChange | null;
  yoyMonthChange: StatChange | null;
  vibeCodingEraChange: StatChange | null;
  breakDropIndicator: BreakDropIndicator;
};

const REQUIRED_DATE_KEYS = [
  "recentFullWeek",
  "previousFullWeek",
  "recentFullMonth",
  "previousFullMonth",
  "recentFullYear",
  "previousFullYear",
] as const satisfies (keyof ProjectStatsSummary)[];

type DateKey =
  | (typeof REQUIRED_DATE_KEYS)[number]
  | "lastYearsReferenceWeek"
  | "lastYearsReferenceMonth"
  | "vibeCodingEraReferenceWeek";

export type GetStatsMatrixResult = {
  stats: StatsRow[];
  dates: Record<DateKey, Omit<PeriodStat, "count"> | undefined>;
};

function computeChange(
  recent?: { count: number },
  previous?: { count: number },
): StatChange | null {
  if (!recent || !previous) {
    return null;
  }
  return {
    nominal: recent.count - previous.count,
    percentage: getPercentChange(recent.count, previous.count),
  };
}

const toStatsRow = (
  { projectName, summary }: ProjectStats,
  index: number,
): StatsRow => ({
  projectName,
  color: getChartColorVar(index),
  weeklyChange: computeChange(summary.recentFullWeek, summary.previousFullWeek),
  monthlyChange: computeChange(
    summary.recentFullMonth,
    summary.previousFullMonth,
  ),
  yearlyChange: computeChange(summary.recentFullYear, summary.previousFullYear),
  yoyWeekChange: computeChange(
    summary.recentFullWeek,
    summary.lastYearsReferenceWeek,
  ),
  yoyMonthChange: computeChange(
    summary.recentFullMonth,
    summary.lastYearsReferenceMonth,
  ),
  vibeCodingEraChange: computeChange(
    summary.recentFullWeek,
    summary.vibeCodingEraReferenceWeek,
  ),
  breakDropIndicator: summary.breakDropIndicator,
});

const hasAllRequiredDates = (summary: ProjectStatsSummary) =>
  REQUIRED_DATE_KEYS.every((key) => summary[key] !== undefined);

const pickDates = (
  summary: Partial<Pick<ProjectStatsSummary, DateKey>>,
): GetStatsMatrixResult["dates"] => ({
  recentFullWeek: summary.recentFullWeek,
  previousFullWeek: summary.previousFullWeek,
  recentFullMonth: summary.recentFullMonth,
  previousFullMonth: summary.previousFullMonth,
  recentFullYear: summary.recentFullYear,
  previousFullYear: summary.previousFullYear,
  lastYearsReferenceWeek: summary.lastYearsReferenceWeek,
  lastYearsReferenceMonth: summary.lastYearsReferenceMonth,
  vibeCodingEraReferenceWeek: summary.vibeCodingEraReferenceWeek,
});

const EMPTY_DATES = pickDates({});

const collectDates = (projects: ProjectStats[]) => {
  const eligible = projects.find(({ summary }) => hasAllRequiredDates(summary));
  return eligible ? pickDates(eligible.summary) : EMPTY_DATES;
};

export default function getStatsMatrix(
  stats: UseQueryResult<ProjectStats>[],
): GetStatsMatrixResult {
  const rows = stats.flatMap((query, index) =>
    query.data ? [{ data: query.data, index }] : [],
  );

  return {
    stats: rows.map(({ data, index }) => toStatsRow(data, index)),
    dates: collectDates(rows.map(({ data }) => data)),
  };
}
