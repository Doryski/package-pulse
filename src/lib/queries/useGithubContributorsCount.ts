import { fetchGithubContributorsCount } from "@/api/packageData";
import { getGithubContributorsCountQueryKey } from "@/lib/queries/keys";
import { skipToken, useQuery } from "@tanstack/react-query";

export default function useGithubContributorsCount(
  repoName: string | null | undefined,
) {
  return useQuery({
    queryKey: getGithubContributorsCountQueryKey(repoName ?? null),
    queryFn: repoName
      ? ({ signal }) => fetchGithubContributorsCount(repoName, signal)
      : skipToken,
    staleTime: 15 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });
}
