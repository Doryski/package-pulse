import { cn } from "@/lib/utils/cn";
import { UseQueryResult } from "@tanstack/react-query";
import { memo } from "react";
import ProjectsStatsTable from "./projects-stats-table";

type TableSectionProps = {
  projectsStats: UseQueryResult<
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

const TableSection = memo(({ projectsStats }: TableSectionProps) => {
  const isLoading = projectsStats.some((project) => project.isLoading);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div
      className={cn(
        "mt-4 md:mt-8 lg:mt-16 size-full",
        projectsStats.length === 0 && "hidden",
      )}
    >
      <h3 className="text-center">NPM downloads change by project</h3>
      <div className="mt-2">
        <ProjectsStatsTable projectsStats={projectsStats} />
      </div>
    </div>
  );
});

TableSection.displayName = "TableSection";

export default TableSection;
