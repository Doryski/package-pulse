"use client";
import useProjectsStats from "@/lib/queries/useProjectsStats";
import dynamic from "next/dynamic";
import { memo, Suspense } from "react";
import { UseFormReturn } from "react-hook-form";
import ChartSkeleton from "./chart-skeleton";
import { ProjectsSearchFormValues } from "./projects-form/schema";
import TableSection from "./table-section";
import WidgetsSection from "./widgets-section";

const ChartSection = dynamic(() => import("./chart-section"), {
  ssr: false,
  loading: ChartSkeleton,
});

type StatsSectionProps = {
  form: UseFormReturn<ProjectsSearchFormValues>;
  selectedProjects: string[];
};

const StatsSection = memo(({ form, selectedProjects }: StatsSectionProps) => {
  const selectedProjectsStats = useProjectsStats(selectedProjects, form);

  return (
    <>
      <Suspense fallback={<ChartSkeleton />}>
        <ChartSection projectStats={selectedProjectsStats} />
      </Suspense>
      <TableSection projectsStats={selectedProjectsStats} />
      <WidgetsSection projectsStats={selectedProjectsStats} />
    </>
  );
});

StatsSection.displayName = "StatsSection";

export default StatsSection;
