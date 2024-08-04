import { ChartData } from "@/components/ui/line-chart";
import { SelectedProjectsStatsQueries } from "../types/selected-projects-stats-queries";

export default function prepareChartData(stats: SelectedProjectsStatsQueries) {
  return stats.reduce<ChartData[]>((acc, project) => {
    if (project.data) {
      const projectData = project.data.groupedByWeekData;
      projectData.forEach((data) => {
        const existingData = acc.find((d) => d.time === data.date);
        if (existingData) {
          existingData[project.data.projectName] = data.count;
        } else {
          // @ts-ignore
          acc.push({
            time: data.date,
            [project.data.projectName]: data.count,
          });
        }
      });
    }
    return acc;
  }, []);
}
