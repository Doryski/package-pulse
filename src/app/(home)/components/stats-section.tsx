"use client";
import fetchNPMDownloads, { DATE_FORMAT } from "@/api/fetchNPMDownloads";
import { groupByWeeks } from "@/lib/utils/groupByPeriod";
import sortByDate from "@/lib/utils/sortByDate";
import { useQueries } from "@tanstack/react-query";
import { format } from "date-fns";
import { memo } from "react";
import ChartSection from "./chart-section";
import TableSection from "./table-section";

const StatsSection = memo(
  ({ selectedProjects }: { selectedProjects: string[] }) => {
    const selectedProjectsStats = useQueries({
      queries: selectedProjects.map((projectName) => {
        const todayDate = format(new Date(), DATE_FORMAT);
        return {
          queryKey: ["project-stats", projectName, todayDate],
          queryFn: async () => {
            const sortedDownloads = sortByDate(
              await fetchNPMDownloads(projectName),
            ).slice(0, -1);
            const groupedDownloads = groupByWeeks(sortedDownloads);

            return {
              projectName,
              groupedByWeekData: groupedDownloads,
              rawSortedData: sortedDownloads,
            };
          },
        };
      }),
    });

    return (
      <>
        <ChartSection projectStats={selectedProjectsStats} />
        <TableSection projectsStats={selectedProjectsStats} />
      </>
    );
  },
);

StatsSection.displayName = "StatsSection";

export default StatsSection;
