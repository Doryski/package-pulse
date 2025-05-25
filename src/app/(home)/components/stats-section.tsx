"use client";
import useProjectsStats from "@/lib/queries/useProjectsStats";
import { memo } from "react";
import { UseFormReturn } from "react-hook-form";
import ChartSection from "./chart-section";
import { ProjectsSearchFormValues } from "./projects-form/schema";
import TableSection from "./table-section";

type StatsSectionProps = {
  form: UseFormReturn<ProjectsSearchFormValues>;
  selectedProjects: string[];
};

const StatsSection = memo(({ form, selectedProjects }: StatsSectionProps) => {
  const selectedProjectsStats = useProjectsStats(selectedProjects, form);

  return (
    <>
      <ChartSection projectStats={selectedProjectsStats} />
      <TableSection projectsStats={selectedProjectsStats} />
    </>
  );
});

StatsSection.displayName = "StatsSection";

export default StatsSection;
