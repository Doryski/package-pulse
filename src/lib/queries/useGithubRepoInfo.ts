import { fetchGithubRepoInfo } from "@/api/fetchPackageInfo";
import { useQuery } from "@tanstack/react-query";

export default function useGithubRepoInfo(
  repoName: string,
  projectName: string,
) {
  return useQuery({
    enabled: !!repoName,
    queryKey: ["githubReposInfo", repoName],
    queryFn: async () => ({
      info: await fetchGithubRepoInfo(repoName),
      name: projectName,
    }),
    staleTime: 15 * 60 * 1000, // 15 minutes
    gcTime: 60 * 60 * 1000, // 1 hour
  });
}
