import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import useBooleanState from "@/lib/hooks/useBooleanState";
import { cn } from "@/lib/utils/cn";
import { BarChartIcon, InfoCircledIcon } from "@radix-ui/react-icons";
import { UseQueryResult } from "@tanstack/react-query";
import { memo } from "react";
import ProjectsInfoTable from "./projects-info-table";
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
  const [isInfoTableVisible, showInfoTable, hideInfoTable] =
    useBooleanState(false);

  const handleToggleChange = (value: string) => {
    if (value === "info") {
      showInfoTable();
    } else {
      hideInfoTable();
    }
  };

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
      <div className="flex justify-between">
        <div />
        <h3 className="text-center">NPM downloads change by project</h3>
        <ToggleGroup
          type="single"
          onValueChange={handleToggleChange}
          defaultValue="stats"
        >
          <ToggleGroupItem value="stats" aria-label="Toggle stats">
            <BarChartIcon />
          </ToggleGroupItem>
          <ToggleGroupItem value="info" aria-label="Toggle info">
            <InfoCircledIcon />
          </ToggleGroupItem>
        </ToggleGroup>
      </div>
      <div className="mt-1 md:mt-2">
        {isInfoTableVisible ? (
          <ProjectsInfoTable />
        ) : (
          <ProjectsStatsTable projectsStats={projectsStats} />
        )}
      </div>
    </div>
  );
});

TableSection.displayName = "TableSection";

export default TableSection;
