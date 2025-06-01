import { ProjectStatsQuery } from "@/lib/queries/useProjectsStats";
import { max } from "@/lib/utils/math";

export default function getPeakAndLatestDownloads(
  projectsStats: ProjectStatsQuery[],
) {
  return projectsStats
    .filter((project) => project.data)
    .map((project) => {
      const data = project.data!;
      const latestDownloads = data.rawSortedData.slice(-2)[0]?.count || 0;
      const peakDownloads = max(data.rawSortedData, (item) => item.count);

      return {
        name: data.projectName,
        latestDownloads,
        peakDownloads: peakDownloads?.count || 0,
      };
    });
}
