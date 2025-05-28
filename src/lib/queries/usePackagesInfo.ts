import { fetchPackageInfo } from "@/api/fetchPackageInfo";
import { useQueries } from "@tanstack/react-query";

export default function usePackagesInfo(selectedProjects: string[]) {
  return useQueries({
    queries: selectedProjects.map((project) => ({
      queryKey: ["projectsInfo", project],
      queryFn: () => fetchPackageInfo(project),
      staleTime: 10 * 60 * 1000, // 10 minutes
      gcTime: 30 * 60 * 1000, // 30 minutes
      enabled: !!project,
    })),
  });
}
