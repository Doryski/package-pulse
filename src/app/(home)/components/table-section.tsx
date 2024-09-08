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
  return (
    <div className="mt-8 size-full">
      <h3 className="text-center">NPM downloads change by project</h3>
      <div className="mt-2">
        <ProjectsStatsTable projectsStats={projectsStats} />
      </div>
    </div>
  );
});

TableSection.displayName = "TableSection";

export default TableSection;
