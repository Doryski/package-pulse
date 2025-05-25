import { ChartData } from "@/components/ui/line-chart";
import { ProjectStats } from "@/lib/queries/useProjectsStats";
import { UseQueryResult } from "@tanstack/react-query";
import normalizeProjectName from "./normalizeProjectName";

export default function prepareChartData(
  stats: UseQueryResult<ProjectStats>[],
) {
  return stats.reduce<ChartData[]>((acc, project) => {
    if (project.data) {
      const projectData = project.data.groupedByWeekData;
      const projectName = project.data.projectName;
      const normalizedProjectName = normalizeProjectName(projectName);

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
