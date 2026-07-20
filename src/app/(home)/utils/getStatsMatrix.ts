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

const GROUP_STATS_CACHE_MAX = 50 as const;
const STATS_CACHE_MAX = 100 as const;

const statsCache = new Map<string, StatsRow>();
const groupStatsCache = new Map<string, ReturnType<typeof groupStats>>();

function setWithLimit<K, V>(map: Map<K, V>, key: K, value: V, max: number) {
  map.set(key, value);
  if (map.size <= max) {
    return;
  }
  const firstKey = map.keys().next().value;
  if (firstKey !== undefined) {
    map.delete(firstKey);
  }
}

function fingerprintData(rawData: DownloadStat[]) {
  const sum = rawData.reduce((total, { count }) => total + count, 0);
  return `${rawData[rawData.length - 1]?.count ?? ""}-${sum}`;
}

export type StatChange = {
  nominal: number;
  percentage: number;
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
  const cacheKey = `${projectName}-${rawData.length}-${rawData[0]?.date || ""}-${rawData[rawData.length - 1]?.date || ""}-${fingerprintData(rawData)}`;

  if (groupStatsCache.has(cacheKey)) {
    return groupStatsCache.get(cacheKey)!;
  }

  const result = groupStats(rawData);
  setWithLimit(groupStatsCache, cacheKey, result, GROUP_STATS_CACHE_MAX);

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

    const dataSignature = `${projectName}-${query.data.rawSortedData.length}-${theme}-${index}-${fingerprintData(query.data.rawSortedData)}`;

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

    const weeklyChange = computeChange(recentFullWeek, previousFullWeek);
    const monthlyChange = computeChange(recentFullMonth, previousFullMonth);
    const yearlyChange = computeChange(recentFullYear, previousFullYear);
    const yoyWeekChange = computeChange(
      recentFullWeek,
      lastYearsReferenceWeekStats,
    );
    const yoyMonthChange = computeChange(
      recentFullMonth,
      lastYearsReferenceMonthStats,
    );
    const vibeCodingEraChange = computeChange(
      recentFullWeek,
      vibeCodingEraReferenceWeekStats,
    );

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

    setWithLimit(statsCache, dataSignature, result, STATS_CACHE_MAX);

    acc.push(result);
    return acc;
  }, []);

  return {
    stats: statsData,
    dates: collectedDates,
  };
}
