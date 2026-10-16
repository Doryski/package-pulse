import { getProjectStatsQueryKey } from "@/lib/queries/keys";
import { useQueries, UseQueryResult } from "@tanstack/react-query";

const toStatsStateQuery = (projectName: string) => ({
  queryKey: getProjectStatsQueryKey(projectName),
  enabled: false,
});

const countPending = (results: Pick<UseQueryResult, "isPending">[]) =>
  results.filter((result) => result.isPending).length;

export default function usePendingProjectsStatsCount(
  selectedProjects: string[],
) {
  return useQueries({
    queries: selectedProjects.map(toStatsStateQuery),
    combine: countPending,
  });
}
