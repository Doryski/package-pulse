import fetchDownloadsBatch from "@/api/fetchDownloadsBatch";
import { ProjectsSearchFormValues } from "@/app/(home)/components/projects-form/schema";
import {
  GetStatsMatrixResult,
  StatsRow,
} from "@/app/(home)/utils/getStatsMatrix";
import { SortColumn, SortDirection } from "@/components/ui/table-head-sortable";
import { getProjectStatsQueryKey } from "@/lib/queries/keys";
import AppError from "@/lib/utils/AppError";
import {
  DownloadStat,
  groupByWeeks,
  PeriodStat,
} from "@/lib/utils/groupByPeriod";
import sortByDate from "@/lib/utils/sortByDate";
import {
  QueryObserverSuccessResult,
  useQueries,
  UseQueryResult,
} from "@tanstack/react-query";
import { useMemo } from "react";
import { UseFormReturn } from "react-hook-form";
import { toast } from "sonner";

const BATCH_ERROR_MESSAGE = "Failed to fetch NPM download data";

export type ProjectStats = {
  projectName: string;
  groupedByWeekData: PeriodStat[];
  rawSortedData: DownloadStat[];
};
export type ProjectStatsQuery = UseQueryResult<ProjectStats, Error>;

type SuccessfulProjectQuery = QueryObserverSuccessResult<ProjectStats>;

export default function useProjectsStats(
  selectedProjects: string[],
  form: UseFormReturn<ProjectsSearchFormValues>,
) {
  const queries = useQueries({
    queries: selectedProjects.map((projectName, index) => {
      return {
        queryKey: getProjectStatsQueryKey(projectName),
        retry: false,
        queryFn: async () => {
          try {
            const batch = await fetchDownloadsBatch(selectedProjects);
            const downloads = batch.data[projectName];
            if (!downloads) {
              throw new AppError(
                batch.errors[projectName] ??
                  `Package "${projectName}" not found`,
              );
            }

            const sortedDownloads = sortByDate(
              downloads,
              (download) => new Date(download.date),
            );
            const groupedDownloads = groupByWeeks(sortedDownloads).slice(0, -1);

            return {
              projectName,
              groupedByWeekData: groupedDownloads,
              rawSortedData: sortedDownloads,
            };
          } catch (error) {
            if (error instanceof AppError) {
              form.setError(`projects.${index}`, { message: error.message });
              toast.error(error.message, { id: error.message });
            } else {
              form.setError(`projects.${index}`, {
                message: "Something went wrong. Please try again.",
              });
              toast.error(BATCH_ERROR_MESSAGE, { id: BATCH_ERROR_MESSAGE });
            }
            throw error;
          }
        },
      };
    }),
  });

  const stabilityKey = queries
    .map((query) => {
      if (!query.data) return "";
      const { projectName, rawSortedData } = query.data;
      const last = rawSortedData.at(-1);
      const total = rawSortedData.reduce((sum, entry) => sum + entry.count, 0);
      return `${projectName}:${rawSortedData.length}:${last?.date ?? ""}:${last?.count ?? 0}:${total}`;
    })
    .join("|");

  return useMemo(
    () =>
      queries.filter(
        (query): query is SuccessfulProjectQuery => query.data !== undefined,
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [stabilityKey],
  );
}

export function sortStatsMatrix(
  statsMatrix: GetStatsMatrixResult,
  sortColumn: SortColumn,
  sortDirection: SortDirection,
) {
  if (!statsMatrix?.stats) return [];
  const directionFactor = sortDirection === "asc" ? 1 : -1;
  const valueSelectors = {
    projectName: (row: StatsRow) => row.projectName,
    breakDrop: (row: StatsRow) =>
      row.breakDropIndicator.corporateUsageScore ?? 0,
    vibeCodingEra: (row: StatsRow) => row.vibeCodingEraChange?.percentage ?? 0,
    weekly: (row: StatsRow) => row.weeklyChange?.percentage ?? 0,
    monthly: (row: StatsRow) => row.monthlyChange?.percentage ?? 0,
    yearly: (row: StatsRow) => row.yearlyChange?.percentage ?? 0,
    yoyWeek: (row: StatsRow) => row.yoyWeekChange?.percentage ?? 0,
    yoyMonth: (row: StatsRow) => row.yoyMonthChange?.percentage ?? 0,
  } satisfies Record<SortColumn, (row: StatsRow) => string | number>;
  const selectValue = valueSelectors[sortColumn];
  return statsMatrix.stats.toSorted((a, b) => {
    const aValue = selectValue(a);
    const bValue = selectValue(b);
    if (typeof aValue === "string" && typeof bValue === "string") {
      return aValue.localeCompare(bValue) * directionFactor;
    }
    return (Number(aValue) - Number(bValue)) * directionFactor;
  });
}
