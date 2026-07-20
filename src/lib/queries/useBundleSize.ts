import { fetchBundleSize } from "@/api/fetchPackageInfo";
import { useQueries } from "@tanstack/react-query";

export default function useBundleSize(selectedProjects: string[]) {
  return useQueries({
    queries: selectedProjects.map((project) => ({
      queryKey: ["bundleSize", project],
      queryFn: () => fetchBundleSize(project),
      staleTime: 10 * 60 * 1000, // 10 minutes
      gcTime: 30 * 60 * 1000, // 30 minutes
      enabled: !!project,
    })),
  });
}
