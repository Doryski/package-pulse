import { ChartData, NormalizedChartData } from "@/components/ui/line-chart";
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

export function prepareNormalizedChartData(
  stats: UseQueryResult<ProjectStats>[],
) {
  const rows: NormalizedChartData[] = [];

  stats.forEach((project) => {
    if (!project.data) return;

    const projectData = project.data.groupedByWeekData;
    const projectName = project.data.projectName;

    const firstActiveIndex = projectData.findIndex((data) => data.count > 0);
    if (firstActiveIndex === -1) return;

    projectData.slice(firstActiveIndex).forEach((data, weekIndex) => {
      const existingData = rows[weekIndex] ?? { weekIndex };
      existingData[projectName] = data.count;
      rows[weekIndex] = existingData;
    });
  });

  return rows;
}
