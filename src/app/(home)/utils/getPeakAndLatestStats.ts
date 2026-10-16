import { ProjectStatsQuery } from "@/lib/queries/useProjectsStats";

export default function getPeakAndLatestDownloads(
  projectsStats: ProjectStatsQuery[],
) {
  return projectsStats.flatMap(({ data }) => {
    if (!data) return [];
    const { latestDownloads, peakDownloads } = data.summary;
    return [{ name: data.projectName, latestDownloads, peakDownloads }];
  });
}
