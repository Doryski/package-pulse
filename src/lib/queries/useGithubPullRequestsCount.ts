import { fetchGithubPullRequestsCount } from "@/api/packageData";
import { getGithubPullRequestsCountQueryKey } from "@/lib/queries/keys";
import { skipToken, useQuery } from "@tanstack/react-query";

export default function useGithubPullRequestsCount(
  repoName: string | null | undefined,
) {
  return useQuery({
    queryKey: getGithubPullRequestsCountQueryKey(repoName ?? null),
    queryFn: repoName
      ? ({ signal }) => fetchGithubPullRequestsCount(repoName, signal)
      : skipToken,
    staleTime: 15 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });
}
