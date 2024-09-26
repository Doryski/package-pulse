"use client";
import fetchNPMDownloads from "@/api/fetchNPMDownloads";
import { getProjectStatsQueryKey } from "@/lib/queries/keys";
import AppError from "@/lib/utils/AppError";
import { groupByWeeks } from "@/lib/utils/groupByPeriod";
import sortByDate from "@/lib/utils/sortByDate";
import { QueryObserverSuccessResult, useQueries } from "@tanstack/react-query";
import { memo } from "react";
import { UseFormReturn } from "react-hook-form";
import { toast } from "sonner";
import ChartSection from "./chart-section";
import { ProjectsSearchFormValues } from "./projects-form/schema";
import TableSection from "./table-section";

type SuccessfulProjectQuery = QueryObserverSuccessResult<{
  projectName: string;
  groupedByWeekData: { date: string; count: number }[];
  rawSortedData: { date: string; count: number }[];
}>;

type StatsSectionProps = {
  form: UseFormReturn<ProjectsSearchFormValues>;
  selectedProjects: string[];
};

const StatsSection = memo(({ form, selectedProjects }: StatsSectionProps) => {
  const selectedProjectsStats = useQueries({
    queries: selectedProjects.map((projectName, index) => {
      return {
        queryKey: getProjectStatsQueryKey(projectName),
        queryFn: async () => {
          try {
            const sortedDownloads = sortByDate(
              await fetchNPMDownloads(projectName),
              (download) => new Date(download.date),
            );
            const groupedDownloads = groupByWeeks(sortedDownloads).slice(0, -1);

            return {
              projectName,
              groupedByWeekData: groupedDownloads,
              rawSortedData: sortedDownloads,
            };
          } catch (error) {
            if (error instanceof AppError) {
              form.setError(`projects.${index}`, {
                message: error.message,
              });
              toast.error(error.message);
            } else {
              toast.error(`Failed to fetch stats for project ${projectName}`);
              form.setError(`projects.${index}`, {
                message: "Something went wrong. Please try again.",
              });
            }
          }
        },
      };
    }),
  }).filter(
    (query): query is SuccessfulProjectQuery => query.data !== undefined,
  );

  return (
    <>
      <ChartSection projectStats={selectedProjectsStats} />
      <TableSection projectsStats={selectedProjectsStats} />
    </>
  );
});

StatsSection.displayName = "StatsSection";

export default StatsSection;
