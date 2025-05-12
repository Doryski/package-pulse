"use client";
import getChartConfig from "@/app/(home)/utils/getChartConfig";
import MultipleLineChart from "@/components/ui/line-chart";
import usePackagesInfo from "@/lib/queries/usePackagesInfo";
import { cn } from "@/lib/utils/cn";
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
  const packagesInfo = usePackagesInfo(
    projectStats
      .map((project) => project.data?.projectName)
      .filter((project) => project !== undefined),
  );
  const chartConfig = useMemo(
    () => getChartConfig(projectStats, packagesInfo),
    [packagesInfo, projectStats],
  );

  const processedProjectsStats = useMemo(
    () => prepareChartData(projectStats),
    [projectStats],
  );

  return (
    <div
      className={cn(
        "mt-4 md:mt-8 lg:mt-16 size-full",
        processedProjectsStats.length === 0 && "hidden",
      )}
    >
      <MultipleLineChart
        chartKey="main-chart"
        data={processedProjectsStats}
        config={chartConfig}
      />
    </div>
  );
});

ChartSection.displayName = "ChartSection";

export default ChartSection;
