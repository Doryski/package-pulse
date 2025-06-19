import { VIBE_CODING_ERA_REFERENCE_DATE } from "@/lib/config/constants";
import { ProjectStats } from "@/lib/queries/useProjectsStats";
import {
  BreakDropIndicator,
  calculateBreakDrop,
} from "@/lib/utils/calculateBreakDrop";
import { UseQueryResult } from "@tanstack/react-query";
import { isWithinInterval, subYears } from "date-fns";
import getChartColor from "../../../lib/utils/getChartColor";
import getPercentChange from "../../../lib/utils/getPercentChange";
import {
  DownloadStat,
  groupStats,
  PeriodStat,
} from "../../../lib/utils/groupByPeriod";

const statsCache = new Map<string, StatsRow>();
const groupStatsCache = new Map<string, ReturnType<typeof groupStats>>();

export type StatChange = {
  nominal: number;
  percentage: number;
};
export type StatsRow = {
  projectName: string;
  color: string | undefined;
  weeklyChange: StatChange | null;
  monthlyChange: StatChange | null;
  yearlyChange: StatChange | null;
  yoyWeekChange: StatChange | null;
  yoyMonthChange: StatChange | null;
  vibeCodingEraChange: StatChange | null;
  breakDropIndicator: BreakDropIndicator;
};

function getCachedGroupStats(projectName: string, rawData: DownloadStat[]) {
  const cacheKey = `${projectName}-${rawData.length}-${rawData[0]?.date || ""}-${rawData[rawData.length - 1]?.date || ""}`;

  if (groupStatsCache.has(cacheKey)) {
    return groupStatsCache.get(cacheKey)!;
  }

  const result = groupStats(rawData);
  groupStatsCache.set(cacheKey, result);

  if (groupStatsCache.size > 50) {
    const firstKey = groupStatsCache.keys().next().value;
    if (firstKey) {
      groupStatsCache.delete(firstKey);
    }
  }

  return result;
}

export type GetStatsMatrixResult = {
  stats: StatsRow[];
  dates: {
    recentFullWeek: Omit<PeriodStat, "count"> | undefined;
    previousFullWeek: Omit<PeriodStat, "count"> | undefined;
    recentFullMonth: Omit<PeriodStat, "count"> | undefined;
    previousFullMonth: Omit<PeriodStat, "count"> | undefined;
    recentFullYear: Omit<PeriodStat, "count"> | undefined;
    previousFullYear: Omit<PeriodStat, "count"> | undefined;
    lastYearsReferenceWeek: Omit<PeriodStat, "count"> | undefined;
    lastYearsReferenceMonth: Omit<PeriodStat, "count"> | undefined;
    vibeCodingEraReferenceWeek: Omit<PeriodStat, "count"> | undefined;
  };
};

export default function getStatsMatrix(
  stats: UseQueryResult<ProjectStats>[],
  theme: string | undefined,
): GetStatsMatrixResult {
  let collectedDates: GetStatsMatrixResult["dates"] = {
    recentFullWeek: undefined,
    previousFullWeek: undefined,
    recentFullMonth: undefined,
    previousFullMonth: undefined,
    recentFullYear: undefined,
    previousFullYear: undefined,
    lastYearsReferenceWeek: undefined,
    lastYearsReferenceMonth: undefined,
    vibeCodingEraReferenceWeek: undefined,
  };

  const statsData = stats.reduce<StatsRow[]>((acc, query, index) => {
    const projectName = query.data?.projectName;
    if (!projectName || !query.data) {
      return acc;
    }

    const dataSignature = `${projectName}-${query.data.rawSortedData.length}-${theme}-${index}`;

    const color = getChartColor(theme, index);
    const groupedStats = getCachedGroupStats(
      projectName,
      query.data.rawSortedData,
    );

    const recentFullWeek = groupedStats.byWeeks.at(-2);
    const previousFullWeek = groupedStats.byWeeks.at(-3);
    const recentFullMonth = groupedStats.byMonths.at(-2);
    const previousFullMonth = groupedStats.byMonths.at(-3);
    const recentFullYear = groupedStats.byYears.at(-2);
    const previousFullYear = groupedStats.byYears.at(-3);

    const lastDayOfRecentWeek = recentFullWeek?.end;
    const lastYearsReferenceWeek = lastDayOfRecentWeek
      ? subYears(lastDayOfRecentWeek, 1)
      : undefined;
    const lastYearsReferenceWeekStats = groupedStats.byWeeks.toReversed().find(
      (week) =>
        lastYearsReferenceWeek &&
        isWithinInterval(lastYearsReferenceWeek, {
          start: week.start,
          end: week.end,
        }),
    );

    const lastDayOfRecentMonth = recentFullMonth?.end;
    const lastYearsReferenceMonth = lastDayOfRecentMonth
      ? subYears(lastDayOfRecentMonth, 1)
      : undefined;
    const lastYearsReferenceMonthStats = groupedStats.byMonths
      .toReversed()
      .find(
        (month) =>
          lastYearsReferenceMonth &&
          isWithinInterval(lastYearsReferenceMonth, {
            start: month.start,
            end: month.end,
          }),
      );

    const vibeCodingEraReferenceDate = new Date(VIBE_CODING_ERA_REFERENCE_DATE);
    const vibeCodingEraReferenceWeekStats = groupedStats.byWeeks.find((week) =>
      isWithinInterval(vibeCodingEraReferenceDate, {
        start: new Date(week.start),
        end: new Date(week.end),
      }),
    );

    if (
      collectedDates.recentFullWeek === undefined &&
      recentFullWeek &&
      previousFullWeek &&
      recentFullMonth &&
      previousFullMonth &&
      recentFullYear &&
      previousFullYear
    ) {
      collectedDates = {
        recentFullWeek: recentFullWeek,
        previousFullWeek: previousFullWeek,
        recentFullMonth: recentFullMonth,
        previousFullMonth: previousFullMonth,
        recentFullYear: recentFullYear,
        previousFullYear: previousFullYear,
        lastYearsReferenceWeek: lastYearsReferenceWeekStats,
        lastYearsReferenceMonth: lastYearsReferenceMonthStats,
        vibeCodingEraReferenceWeek: vibeCodingEraReferenceWeekStats,
      };
    }

    if (statsCache.has(dataSignature)) {
      acc.push(statsCache.get(dataSignature)!);
      return acc;
    }

    const weeklyChange =
      recentFullWeek && previousFullWeek
        ? {
            nominal: recentFullWeek.count - previousFullWeek.count,
            percentage: getPercentChange(
              recentFullWeek.count,
              previousFullWeek.count,
            ),
          }
        : null;

    const monthlyChange =
      recentFullMonth && previousFullMonth
        ? {
            nominal: recentFullMonth.count - previousFullMonth.count,
            percentage: getPercentChange(
              recentFullMonth.count,
              previousFullMonth.count,
            ),
          }
        : null;

    const yearlyChange =
      recentFullYear && previousFullYear
        ? {
            nominal: recentFullYear.count - previousFullYear.count,
            percentage: getPercentChange(
              recentFullYear.count,
              previousFullYear.count,
            ),
          }
        : null;

    const yoyWeekChange =
      lastYearsReferenceWeekStats && recentFullWeek
        ? {
            nominal: recentFullWeek.count - lastYearsReferenceWeekStats.count,
            percentage: getPercentChange(
              recentFullWeek.count,
              lastYearsReferenceWeekStats.count,
            ),
          }
        : null;

    const yoyMonthChange =
      lastYearsReferenceMonthStats && recentFullMonth
        ? {
            nominal: recentFullMonth.count - lastYearsReferenceMonthStats.count,
            percentage: getPercentChange(
              recentFullMonth.count,
              lastYearsReferenceMonthStats.count,
            ),
          }
        : null;

    const vibeCodingEraChange =
      vibeCodingEraReferenceWeekStats && recentFullWeek
        ? {
            nominal:
              recentFullWeek.count - vibeCodingEraReferenceWeekStats.count,
            percentage: getPercentChange(
              recentFullWeek.count,
              vibeCodingEraReferenceWeekStats.count,
            ),
          }
        : null;

    const breakDropIndicator = calculateBreakDrop(query.data.rawSortedData);

    const result: StatsRow = {
      projectName,
      weeklyChange,
      monthlyChange,
      yearlyChange,
      yoyWeekChange,
      yoyMonthChange,
      vibeCodingEraChange,
      breakDropIndicator,
      color,
    };

    statsCache.set(dataSignature, result);

    if (statsCache.size > 100) {
      const firstKey = statsCache.keys().next().value;
      if (firstKey) {
        statsCache.delete(firstKey);
      }
    }

    acc.push(result);
    return acc;
  }, []);

  return {
    stats: statsData,
    dates: collectedDates,
  };
}
