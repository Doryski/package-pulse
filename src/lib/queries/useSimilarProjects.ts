import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { fetchSimilarProjects } from "../utils/fetchSimilarProjects";

export default function useSimilarProjects(projectNames: string[]) {
  const sortedProjectNames = useMemo(
    () => projectNames.toSorted(),
    [projectNames],
  );

  return useQuery({
    queryKey: ["similarProjects", sortedProjectNames.join(",")],
    queryFn: () => fetchSimilarProjects(sortedProjectNames),
    enabled: sortedProjectNames.length > 0,
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
