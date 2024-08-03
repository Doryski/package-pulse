import { UseQueryResult } from "@tanstack/react-query";

export default function getChartConfig(
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
