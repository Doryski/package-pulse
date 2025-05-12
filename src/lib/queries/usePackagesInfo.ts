import { fetchPackageInfo } from "@/api/fetchPackageInfo";
import { useQueries } from "@tanstack/react-query";

export default function usePackagesInfo(selectedProjects: string[]) {
  return useQueries({
    queries: selectedProjects.map((project) => ({
      queryKey: ["projectsInfo", project],
      queryFn: () => fetchPackageInfo(project),
      retry: false,
    })),
  });
}
