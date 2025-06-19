import fetchNPMDownloads from "@/api/fetchNPMDownloads";
import { ProjectsSearchFormValues } from "@/app/(home)/components/projects-form/schema";
import { GetStatsMatrixResult } from "@/app/(home)/utils/getStatsMatrix";
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
import { UseFormReturn } from "react-hook-form";
import { toast } from "sonner";

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
  return useQueries({
    queries: selectedProjects.map((projectName, index) => {
      return {
        queryKey: getProjectStatsQueryKey(projectName),
        queryFn: async () => {
          try {
            const sortedDownloads = sortByDate(
              await fetchNPMDownloads(projectName),
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
              form.setError(`projects.${index}`, {
                message: error.message,
              });
              toast.error(error.message);
            } else {
              toast.error(`Failed to fetch stats for project ${projectName}`);
              form.setError(`projects.${index}`, {
                message: "Something went wrong. Please try again.",
              });
            }
          }
        },
      };
    }),
  }).filter(
    (query): query is SuccessfulProjectQuery => query.data !== undefined,
  );
}

export function sortStatsMatrix(
  statsMatrix: GetStatsMatrixResult,
  sortColumn: SortColumn,
  sortDirection: SortDirection,
) {
  return statsMatrix.stats.toSorted((a, b) => {
    if (sortColumn === "projectName") {
      return sortDirection === "desc"
        ? b.projectName.localeCompare(a.projectName)
        : a.projectName.localeCompare(b.projectName);
    } else if (sortColumn === "breakDrop") {
      const aValue = a.breakDropIndicator.corporateUsageScore;
      const bValue = b.breakDropIndicator.corporateUsageScore;
      return sortDirection === "desc"
        ? (bValue ?? 0) - (aValue ?? 0)
        : (aValue ?? 0) - (bValue ?? 0);
    } else if (sortColumn === "vibeCodingEra") {
      const aValue = a.vibeCodingEraChange?.percentage ?? 0;
      const bValue = b.vibeCodingEraChange?.percentage ?? 0;
      return sortDirection === "desc" ? bValue - aValue : aValue - bValue;
    } else {
      const aValue = a[`${sortColumn}Change`]?.percentage ?? 0;
      const bValue = b[`${sortColumn}Change`]?.percentage ?? 0;
      return sortDirection === "desc" ? bValue - aValue : aValue - bValue;
    }
  });
}
