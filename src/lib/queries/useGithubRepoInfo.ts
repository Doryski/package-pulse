import { fetchGithubRepoInfo, type DepsDevInfo } from "@/api/packageData";
import { getGithubRepoInfoQueryKey } from "@/lib/queries/keys";
import { skipToken, useQuery, UseQueryResult } from "@tanstack/react-query";

type DepsDevQuery = Pick<UseQueryResult<DepsDevInfo>, "data" | "isPending">;

const hasDepsDevGithubStats = (data: DepsDevInfo | undefined) =>
  !!data?.projectId && data.starsCount !== null;

export const needsGithubRepoFallback = (depsDev: DepsDevQuery | undefined) => {
  if (depsDev?.isPending) return false;
  return !hasDepsDevGithubStats(depsDev?.data);
};

export default function useGithubRepoInfo(
  repoName: string | null | undefined,
  depsDev: DepsDevQuery | undefined,
) {
  const enabled = !!repoName && needsGithubRepoFallback(depsDev);

  return useQuery({
    queryKey: getGithubRepoInfoQueryKey(repoName ?? null),
    queryFn:
      enabled && repoName
        ? ({ signal }) => fetchGithubRepoInfo(repoName, signal)
        : skipToken,
    staleTime: 15 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });
}
