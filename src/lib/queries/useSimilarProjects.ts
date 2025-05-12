import { PackageInfo } from "@/api/fetchPackageInfo";
import { useQuery } from "@tanstack/react-query";
import { fetchSimilarProjects } from "../utils/fetchSimilarProjects";

export default function useSimilarProjects(packagesInfo: PackageInfo[]) {
  return useQuery({
    queryKey: ["similarProjects", packagesInfo.map((info) => info.projectName)],
    queryFn: () => fetchSimilarProjects(packagesInfo),
    enabled: packagesInfo.length > 0,
    staleTime: 1000 * 60 * 60 * 24, // 24 hours
    retry: 1,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  });
}
