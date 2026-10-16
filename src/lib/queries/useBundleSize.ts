import { loadBundleSize } from "@/api/packageData";
import { getBundleSizeQueryKey } from "@/lib/queries/keys";
import { queryOptions, skipToken, useQueries } from "@tanstack/react-query";
import usePackagesInfo from "./usePackagesInfo";

export const bundleSizeQueryOptions = (
  projectName: string,
  version: string | null | undefined,
) =>
  queryOptions({
    queryKey: getBundleSizeQueryKey(projectName, version ?? null),
    queryFn:
      projectName && version
        ? ({ signal }) => loadBundleSize(projectName, version, signal)
        : skipToken,
    staleTime: Infinity,
    gcTime: 30 * 60 * 1000,
  });

export default function useBundleSize(selectedProjects: string[]) {
  const packagesInfo = usePackagesInfo(selectedProjects);

  return useQueries({
    queries: selectedProjects.map((projectName, index) =>
      bundleSizeQueryOptions(
        projectName,
        packagesInfo[index]?.data?.latestVersion,
      ),
    ),
  });
}
