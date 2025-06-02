import { fetchGithubPullRequestsCount } from "@/api/fetchPackageInfo";
import { useQuery } from "@tanstack/react-query";

export default function useGithubPullRequestsCount(
  repoName: string,
  projectName: string,
  enabled: boolean,
) {
  return useQuery({
    enabled,
    queryKey: ["githubPullRequestsCount", repoName],
    queryFn: async () => ({
      count: await fetchGithubPullRequestsCount(repoName),
      name: projectName,
    }),
    staleTime: 15 * 60 * 1000, // 15 minutes
    gcTime: 60 * 60 * 1000, // 1 hour
  });
}
