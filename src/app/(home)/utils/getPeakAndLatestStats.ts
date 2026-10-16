import { ProjectStatsQuery } from "@/lib/queries/useProjectsStats";
import { max } from "@/lib/utils/math";

export const getLatestDownloads = (series: { count: number }[]) =>
  series.at(-1)?.count ?? 0;

export default function getPeakAndLatestDownloads(
  projectsStats: ProjectStatsQuery[],
) {
  return projectsStats
    .filter((project) => project.data)
    .map((project) => {
      const data = project.data!;
      const latestDownloads = getLatestDownloads(data.rawSortedData);
      const peakDownloads = max(data.rawSortedData, (item) => item.count);

      return {
        name: data.projectName,
        latestDownloads,
        peakDownloads: peakDownloads?.count || 0,
      };
    });
}
