"use client";
import getChartConfig from "@/lib/utils/getChartConfig";
import prepareChartData from "@/lib/utils/prepareChartData";
import { UseQueryResult } from "@tanstack/react-query";
import { memo, useMemo } from "react";
import MultipleLineChart from "./ui/line-chart";

type ChartSectionProps = {
  projectStats: UseQueryResult<
    {
      projectName: string;
      groupedByWeekData: {
        date: string;
        count: number;
      }[];
      rawSortedData: {
        date: string;
        count: number;
      }[];
    },
    Error
  >[];
};

const ChartSection = memo(({ projectStats }: ChartSectionProps) => {
  const chartConfig = useMemo(
    () => getChartConfig(projectStats),
    [projectStats],
  );

  const processedProjectsStats = useMemo(
    () => prepareChartData(projectStats),
    [projectStats],
  );

  return (
    <div className="mt-8 size-full">
      <MultipleLineChart data={processedProjectsStats} config={chartConfig} />
    </div>
  );
});

ChartSection.displayName = "ChartSection";

export default ChartSection;
