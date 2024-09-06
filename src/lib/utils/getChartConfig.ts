import { ChartConfig } from "@/components/ui/chart";
import { SelectedProjectsStatsQueries } from "../types/selected-projects-stats-queries";

export default function getChartConfig(
  stats: SelectedProjectsStatsQueries,
): ChartConfig {
  return stats.reduce((acc, query, index) => {
    const projectName = query.data?.projectName;
    if (!projectName) {
      return acc;
    }
    return {
      ...acc,
      [projectName]: {
        label: projectName,
        color: `hsl(var(--chart-${index + 1}))`,
      },
    };
  }, {});
}
