import fetchNPMDownloads from "@/api/fetchNPMDownloads";
import { ProjectsSearchFormValues } from "@/app/(home)/components/projects-form/schema";
import getStatsMatrix from "@/app/(home)/utils/getStatsMatrix";
import { SortColumn, SortDirection } from "@/components/ui/table-head-sortable";
import { getProjectStatsQueryKey } from "@/lib/queries/keys";
import AppError from "@/lib/utils/AppError";
import { groupByWeeks } from "@/lib/utils/groupByPeriod";
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
  groupedByWeekData: { date: string; count: number }[];
  rawSortedData: { date: string; count: number }[];
};

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

export function processProjectsStats(
  projectsStats: UseQueryResult<ProjectStats>[],
  resolvedTheme: string | undefined,
  sortColumn: SortColumn,
  sortDirection: SortDirection,
) {
  const stats = getStatsMatrix(projectsStats, resolvedTheme);
  return stats.toSorted((a, b) => {
    if (sortColumn === "projectName") {
      return sortDirection === "desc"
        ? b.projectName.localeCompare(a.projectName)
        : a.projectName.localeCompare(b.projectName);
    } else if (sortColumn === "breakDrop") {
      const aValue = a.breakDropIndicator.corporateUsageScore;
      const bValue = b.breakDropIndicator.corporateUsageScore;
      return sortDirection === "desc" ? bValue - aValue : aValue - bValue;
    } else {
      const aValue = a[`${sortColumn}Change`]?.percentage ?? 0;
      const bValue = b[`${sortColumn}Change`]?.percentage ?? 0;
      return sortDirection === "desc" ? bValue - aValue : aValue - bValue;
    }
  });
}
