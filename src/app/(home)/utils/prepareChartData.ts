import { ChartData } from "@/components/ui/line-chart";
import { SelectedProjectsStatsQueries } from "../types/selected-projects-stats-queries";
import normalizeProjectName from "./normalizeProjectName";

export default function prepareChartData(stats: SelectedProjectsStatsQueries) {
  return stats.reduce<ChartData[]>((acc, project) => {
    if (project.data) {
      const projectData = project.data.groupedByWeekData;
      const normalizedProjectName = normalizeProjectName(
        project.data.projectName,
      );
      projectData.forEach((data) => {
        const existingData = acc.find((d) => d.time === data.date);
        if (existingData) {
          existingData[normalizedProjectName] = data.count;
        } else {
          const newData = {
            time: data.date,
            [normalizedProjectName]: data.count,
          } as ChartData;
          acc.push(newData);
        }
      });
    }
    return acc;
  }, []);
}
