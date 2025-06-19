import { ChartData } from "@/components/ui/line-chart";
import { ProjectStats } from "@/lib/queries/useProjectsStats";
import { UseQueryResult } from "@tanstack/react-query";

export default function prepareChartData(
  stats: UseQueryResult<ProjectStats>[],
) {
  return stats.reduce<ChartData[]>((acc, project) => {
    if (project.data) {
      const projectData = project.data.groupedByWeekData;
      const projectName = project.data.projectName;

      projectData.forEach((data) => {
        const existingData = acc.find((d) => d.time === data.end);
        if (existingData) {
          existingData[projectName] = data.count;
        } else {
          const newData = {
            time: data.end,
            [projectName]: data.count,
          } as ChartData;
          acc.push(newData);
        }
      });
    }
    return acc;
  }, []);
}
