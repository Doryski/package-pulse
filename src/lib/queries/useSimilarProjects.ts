import AppError from "@/lib/utils/AppError";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import * as z from "zod/mini";

const SimilarProjectsResponseSchema = z.object({
  similarProjects: z.array(z.string()),
});

const SIMILAR_PROJECTS_ENDPOINT = "/api/similar-projects";

const toSimilarProjectsUrl = (projectNames: string[]) =>
  `${SIMILAR_PROJECTS_ENDPOINT}?${new URLSearchParams({
    packages: projectNames.join(","),
  })}`;

const fetchSimilarProjects = async (
  projectNames: string[],
  signal?: AbortSignal,
) => {
  const response = await fetch(toSimilarProjectsUrl(projectNames), { signal });
  if (!response.ok) {
    throw new AppError(`Failed to fetch similar projects: ${response.status}`, {
      status: response.status,
    });
  }
  return SimilarProjectsResponseSchema.parse(await response.json())
    .similarProjects;
};

export default function useSimilarProjects(projectNames: string[]) {
  const sortedProjectNames = useMemo(
    () => projectNames.toSorted(),
    [projectNames],
  );

  return useQuery({
    queryKey: ["similarProjects", sortedProjectNames.join(",")],
    queryFn: ({ signal }) => fetchSimilarProjects(sortedProjectNames, signal),
    enabled: sortedProjectNames.length > 0,
    staleTime: 1000 * 60 * 60 * 24,
    gcTime: 1000 * 60 * 60 * 48,
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: true,
  });
}
