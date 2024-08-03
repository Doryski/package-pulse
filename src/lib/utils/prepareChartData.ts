import { ChartData } from "@/components/ui/line-chart";
import { UseQueryResult } from "@tanstack/react-query";

export default function prepareChartData(
  stats: UseQueryResult<
    {
      projectName: string;
      data: {
        date: string;
        count: number;
      }[];
    },
    Error
  >[],
) {
  return stats.reduce<ChartData[]>((acc, project) => {
    if (project.data) {
      const projectData = project.data.data;
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
