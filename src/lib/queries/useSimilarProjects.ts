import { PackageInfo } from "@/api/fetchPackageInfo";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { fetchSimilarProjects } from "../utils/fetchSimilarProjects";

export default function useSimilarProjects(packagesInfo: PackageInfo[]) {
  const stableProjectNames = useMemo(
    () =>
      packagesInfo
        .map((info) => info.projectName)
        .sort()
        .join(","),
    [packagesInfo],
  );

  const stablePackagesInfo = useMemo(
    () =>
      packagesInfo
        .map((info) => ({
          projectName: info.projectName,
          keywords: info.keywords,
          description: info.description,
        }))
        .sort((a, b) => a.projectName.localeCompare(b.projectName)),
    [packagesInfo],
  );

  return useQuery({
    queryKey: ["similarProjects", stableProjectNames],
    queryFn: () => fetchSimilarProjects(stablePackagesInfo),
    enabled: packagesInfo.length > 0,
    staleTime: 1000 * 60 * 60 * 24, // 24 hours
    gcTime: 1000 * 60 * 60 * 48, // 48 hours
    retry: (failureCount, error) => {
      if (error instanceof Error && error.message.includes("4")) {
        return false;
      }
      return failureCount < 2;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: true,
  });
}
