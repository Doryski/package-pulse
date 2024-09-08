"use client";
import getChartConfig from "@/app/(home)/utils/getChartConfig";
import MultipleLineChart from "@/components/ui/line-chart";
import { UseQueryResult } from "@tanstack/react-query";
import { memo, useMemo } from "react";
import prepareChartData from "../utils/prepareChartData";

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
