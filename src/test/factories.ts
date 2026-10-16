import { formatDate, parseDate } from "@/app/(home)/utils/date-utils";
import type { ProjectStats } from "@/lib/queries/useProjectsStats";
import { buildProjectStats as computeProjectStats } from "@/lib/stats/buildProjectStats";
import type { GlobalComparison } from "@/lib/types/global-comparison";
import { toCompactSeries } from "@/lib/utils/compactSeries";
import { DownloadStat } from "@/lib/utils/groupByPeriod";
import type { QueryObserverSuccessResult } from "@tanstack/react-query";
import { addDays } from "date-fns";
import { vi } from "vitest";

export const DEFAULT_START_DATE = "2024-01-01";

export const FIXED_TIMESTAMP = Date.UTC(2024, 0, 1);

const WEEKEND_DAY_INDEXES = [5, 6] as const;

const isWeekendIndex = (index: number) =>
  WEEKEND_DAY_INDEXES.some((weekendIndex) => index % 7 === weekendIndex);

export const defaultDailyCount = (index: number) =>
  isWeekendIndex(index) ? 500 + index : 1000 + index * 10;

export function buildDownloadStats(
  days: number,
  start = DEFAULT_START_DATE,
  countAt = defaultDailyCount,
): DownloadStat[] {
  const startDate = parseDate(start);
  return Array.from({ length: days }, (_, index) => ({
    date: formatDate(addDays(startDate, index)),
    count: countAt(index),
  }));
}

export type BuildProjectStatsOptions = {
  days?: number;
  start?: string;
  countAt?: (index: number) => number;
  downloads?: DownloadStat[];
  now?: Date;
};

export function buildProjectStats(
  projectName: string,
  {
    days = 28,
    start,
    countAt,
    downloads = buildDownloadStats(days, start, countAt),
    now,
  }: BuildProjectStatsOptions = {},
): ProjectStats {
  return computeProjectStats(projectName, toCompactSeries(downloads), now);
}

export function buildSuccessQuery<TData>(
  data: TData,
): QueryObserverSuccessResult<TData, Error> {
  return {
    data,
    dataUpdatedAt: FIXED_TIMESTAMP,
    error: null,
    errorUpdatedAt: 0,
    errorUpdateCount: 0,
    failureCount: 0,
    failureReason: null,
    fetchStatus: "idle",
    isEnabled: true,
    isError: false,
    isFetched: true,
    isFetchedAfterMount: true,
    isFetching: false,
    isInitialLoading: false,
    isLoading: false,
    isLoadingError: false,
    isPaused: false,
    isPending: false,
    isPlaceholderData: false,
    isRefetchError: false,
    isRefetching: false,
    isStale: false,
    isSuccess: true,
    refetch: vi.fn(),
    status: "success",
  };
}

export function buildGlobalComparison(
  overrides: Partial<GlobalComparison> = {},
): GlobalComparison {
  return {
    id: "comparison-1",
    timestamp: FIXED_TIMESTAMP,
    projects: ["react", "vue"],
    ...overrides,
  };
}
