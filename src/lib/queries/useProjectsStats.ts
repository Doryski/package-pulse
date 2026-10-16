import loadDownloads from "@/api/downloadsLoader";
import { ProjectsSearchFormValues } from "@/app/(home)/components/projects-form/schema";
import {
  GetStatsMatrixResult,
  StatsRow,
} from "@/app/(home)/utils/getStatsMatrix";
import { SortColumn, SortDirection } from "@/components/ui/table-head-sortable";
import { getProjectStatsQueryKey } from "@/lib/queries/keys";
import { buildProjectStats } from "@/lib/stats/buildProjectStats";
import { isAppError } from "@/lib/utils/AppError";
import getMsUntilNextUtcMidnight from "@/lib/utils/getMsUntilNextUtcMidnight";
import {
  Query,
  QueryObserverSuccessResult,
  queryOptions,
  useQueries,
  UseQueryResult,
} from "@tanstack/react-query";
import { useMemo } from "react";
import { UseFormReturn } from "react-hook-form";
import { toast } from "sonner";

const BATCH_ERROR_MESSAGE = "Failed to fetch NPM download data";
const GENERIC_FIELD_ERROR = "Something went wrong. Please try again.";

export type ProjectStats = ReturnType<typeof buildProjectStats> & {
  isPartial?: boolean;
};

export const PARTIAL_STATS_STALE_MS = 5 * 60 * 1000;
export type ProjectStatsQuery = UseQueryResult<ProjectStats, Error>;

type SuccessfulProjectQuery = QueryObserverSuccessResult<ProjectStats>;

type StatsForm = UseFormReturn<ProjectsSearchFormValues>;

export const getProjectStatsStaleTime = (query: Query<ProjectStats>) => {
  if (query.state.data?.isPartial) return PARTIAL_STATS_STALE_MS;
  return getMsUntilNextUtcMidnight(query.state.dataUpdatedAt);
};

const getErrorMessages = (error: unknown) => {
  if (isAppError(error)) return { field: error.message, toast: error.message };
  return { field: GENERIC_FIELD_ERROR, toast: BATCH_ERROR_MESSAGE };
};

const reportStatsError = (form: StatsForm, index: number, error: unknown) => {
  const messages = getErrorMessages(error);
  form.setError(`projects.${index}`, { message: messages.field });
  toast.error(messages.toast, { id: messages.toast });
};

const warnAboutPartialData = (warning: string | undefined) => {
  if (warning) toast.warning(warning, { id: warning });
};

const loadProjectStats = async (
  projectName: string,
  signal: AbortSignal,
): Promise<ProjectStats> => {
  const { series, warning } = await loadDownloads(projectName, signal);
  warnAboutPartialData(warning);
  return {
    ...buildProjectStats(projectName, series),
    isPartial: Boolean(warning),
  };
};

export const projectStatsQueryOptions = (projectName: string) =>
  queryOptions({
    queryKey: getProjectStatsQueryKey(projectName),
    retry: false,
    staleTime: getProjectStatsStaleTime,
    queryFn: ({ signal }) => loadProjectStats(projectName, signal),
  });

const toStabilityKey = (data: ProjectStats | undefined) => {
  if (!data) return "";
  const { projectName, groupedByWeekData, summary } = data;
  const { recentFullWeek, latestDownloads, peakDownloads } = summary;
  return [
    projectName,
    groupedByWeekData.length,
    recentFullWeek?.end ?? "",
    recentFullWeek?.count ?? 0,
    latestDownloads,
    peakDownloads,
  ].join(":");
};

export default function useProjectsStats(
  selectedProjects: string[],
  form: StatsForm,
) {
  const queries = useQueries({
    queries: selectedProjects.map((projectName, index) => ({
      ...projectStatsQueryOptions(projectName),
      queryFn: async ({ signal }) => {
        try {
          return await loadProjectStats(projectName, signal);
        } catch (error) {
          if (!signal.aborted) reportStatsError(form, index, error);
          throw error;
        }
      },
    })),
  });

  const stabilityKey = queries
    .map((query) => toStabilityKey(query.data))
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
