"use client";
import getChartConfig from "@/app/(home)/utils/getChartConfig";
import MultipleLineChart from "@/components/ui/line-chart";
import { useLatestReleases } from "@/lib/queries/usePackagesInfo";
import usePendingProjectsStatsCount from "@/lib/queries/usePendingProjectsStatsCount";
import { ProjectStatsQuery } from "@/lib/queries/useProjectsStats";
import { cn } from "@/lib/utils/cn";
import { memo, useMemo } from "react";
import { useWatch } from "react-hook-form";
import prepareChartData, {
  prepareNormalizedChartData,
} from "../utils/prepareChartData";
import ChartSkeleton from "./chart-skeleton";
import { ProjectsSearchFormValues } from "./projects-form/schema";

type ChartSectionProps = {
  projectStats: ProjectStatsQuery[];
};

const ChartSection = memo(({ projectStats }: ChartSectionProps) => {
  const selectedProjects = useWatch<ProjectsSearchFormValues, "projects">({
    name: "projects",
  });
  const pendingCount = usePendingProjectsStatsCount(selectedProjects);
  const latestReleases = useLatestReleases(
    projectStats
      .map((project) => project.data?.projectName)
      .filter((project) => project !== undefined),
  );
  const chartConfig = useMemo(
    () => getChartConfig(projectStats, latestReleases),
    [latestReleases, projectStats],
  );

  const processedProjectsStats = useMemo(
    () => prepareChartData(projectStats),
    [projectStats],
  );

  const normalizedProjectsStats = useMemo(
    () => prepareNormalizedChartData(projectStats),
    [projectStats],
  );

  const hasData = processedProjectsStats.length > 0;

  if (!hasData && pendingCount > 0) return <ChartSkeleton />;

  return (
    <div
      data-testid="main-chart"
      className={cn("mt-4 size-full md:mt-8 lg:mt-16", !hasData && "hidden")}
    >
      <MultipleLineChart
        chartKey="main-chart"
        data={processedProjectsStats}
        normalizedData={normalizedProjectsStats}
        config={chartConfig}
      />
    </div>
  );
});

ChartSection.displayName = "ChartSection";

export default ChartSection;
