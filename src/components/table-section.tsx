import { UseQueryResult } from "@tanstack/react-query";
import { memo } from "react";
import ProjectsStatsTable from "./stats-table";

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
    <div className="w-full h-full mt-8">
      <h3 className="text-center">NPM downloads change by project</h3>
      <div className="mt-2">
        <ProjectsStatsTable projectsStats={projectsStats} />
      </div>
    </div>
  );
});

TableSection.displayName = "TableSection";

export default TableSection;
