import { ChartData, NormalizedChartData } from "@/components/ui/line-chart";
import { ProjectStats } from "@/lib/queries/useProjectsStats";
import { UseQueryResult } from "@tanstack/react-query";

export default function prepareChartData(
  stats: UseQueryResult<ProjectStats>[],
) {
  const rowsByTime = new Map<string, ChartData>();

  stats.forEach(({ data }) => {
    if (!data) return;
    const { groupedByWeekData, projectName } = data;

    groupedByWeekData.forEach(({ end, count }) => {
      const row = rowsByTime.get(end) ?? ({ time: end } as ChartData);
      row[projectName] = count;
      rowsByTime.set(end, row);
    });
  });

  return [...rowsByTime.values()];
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
