import { loadDepsDev } from "@/api/packageData";
import { getDepsDevQueryKey } from "@/lib/queries/keys";
import { queryOptions, skipToken, useQueries } from "@tanstack/react-query";

export const depsDevQueryOptions = (projectName: string) =>
  queryOptions({
    queryKey: getDepsDevQueryKey(projectName),
    queryFn: projectName
      ? ({ signal }) => loadDepsDev(projectName, signal)
      : skipToken,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

export default function useDepsDev(selectedProjects: string[]) {
  return useQueries({ queries: selectedProjects.map(depsDevQueryOptions) });
}
