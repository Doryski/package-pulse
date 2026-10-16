import { ChartConfig, VersionData } from "@/components/ui/line-chart";
import { ProjectStats } from "@/lib/queries/useProjectsStats";
import { UseQueryResult } from "@tanstack/react-query";
import normalizeProjectName from "./normalizeProjectName";

export default function getChartConfig(
  stats: UseQueryResult<ProjectStats>[],
  latestReleases: readonly (VersionData | null | undefined)[],
): ChartConfig {
  return stats.reduce<ChartConfig>((acc, query, index) => {
    const projectName = query.data?.projectName;
    if (!projectName) return acc;
    return {
      ...acc,
      [normalizeProjectName(projectName)]: {
        label: projectName,
        color: `hsl(var(--chart-${index + 1}))`,
        latestRelease: latestReleases[index] ?? null,
      },
    };
  }, {});
}
