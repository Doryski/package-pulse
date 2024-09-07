import { ChartConfig } from "@/components/ui/chart";
import { SelectedProjectsStatsQueries } from "../types/selected-projects-stats-queries";
import normalizeProjectName from "./normalizeProjectName";

export default function getChartConfig(
  stats: SelectedProjectsStatsQueries,
): ChartConfig {
  return stats.reduce((acc, query, index) => {
    const projectName = query.data?.projectName;
    if (!projectName) {
      return acc;
    }
    const normalizedName = normalizeProjectName(projectName);
    return {
      ...acc,
      [normalizedName]: {
        label: projectName,
        color: `hsl(var(--chart-${index + 1}))`,
      },
    };
  }, {});
}
