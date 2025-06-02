import { fetchContributorsCount } from "@/api/fetchPackageInfo";
import { useQuery } from "@tanstack/react-query";

export default function useGithubContributorsCount(
  repoName: string,
  projectName: string,
  enabled: boolean,
) {
  return useQuery({
    enabled,
    queryKey: ["githubContributorsCount", repoName],
    queryFn: async () => ({
      count: await fetchContributorsCount(repoName),
      name: projectName,
    }),
    staleTime: 15 * 60 * 1000, // 15 minutes
    gcTime: 60 * 60 * 1000, // 1 hour
  });
}
