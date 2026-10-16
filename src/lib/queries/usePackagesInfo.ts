import { loadPackageInfo, type PackageInfo } from "@/api/packageData";
import { getPackageInfoQueryKey } from "@/lib/queries/keys";
import {
  queryOptions,
  skipToken,
  useQueries,
  UseQueryResult,
} from "@tanstack/react-query";

const PACKAGE_INFO_CACHE = {
  staleTime: 10 * 60 * 1000,
  gcTime: 30 * 60 * 1000,
} as const;

export const packageInfoQueryOptions = (projectName: string) =>
  queryOptions({
    queryKey: getPackageInfoQueryKey(projectName),
    queryFn: projectName
      ? ({ signal }) => loadPackageInfo(projectName, signal)
      : skipToken,
    ...PACKAGE_INFO_CACHE,
  });

export const toLatestReleases = (
  results: UseQueryResult<PackageInfo, Error>[],
) => results.map((result) => result.data?.latestRelease ?? null);

export default function usePackagesInfo(selectedProjects: string[]) {
  return useQueries({ queries: selectedProjects.map(packageInfoQueryOptions) });
}

export function useLatestReleases(selectedProjects: string[]) {
  return useQueries({
    queries: selectedProjects.map(packageInfoQueryOptions),
    combine: toLatestReleases,
  });
}
