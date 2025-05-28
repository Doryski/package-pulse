import Loader from "@/components/loader";
import { SimpleTooltip } from "@/components/simple-tooltip";
import BreakDropIndicatorComponent from "@/components/ui/break-drop-indicator";
import DotIndicator from "@/components/ui/dot-indicator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import TableCellWithStats from "@/components/ui/table-cell-with-stats";
import TableHeadSortable, {
  SortColumn,
  SortDirection,
} from "@/components/ui/table-head-sortable";
import LocalStorageKey from "@/lib/enums/LocalStorageKey";
import useLocalStorage from "@/lib/hooks/useLocalStorage";
import { sortStatsMatrix } from "@/lib/queries/useProjectsStats";
import {
  ExclamationTriangleIcon,
  InfoCircledIcon,
} from "@radix-ui/react-icons";
import { UseQueryResult } from "@tanstack/react-query";
import { useTheme } from "next-themes";
import { useCallback, useMemo, useState } from "react";
import getStatsMatrix from "../utils/getStatsMatrix";

type ProjectStats = UseQueryResult<
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
>;

type ProjectsStatsTableProps = { projectsStats: ProjectStats[] };

const ProjectsStatsTable = ({ projectsStats }: ProjectsStatsTableProps) => {
  const { resolvedTheme } = useTheme();
  const [sortColumn, setSortColumn] = useState<SortColumn>("oneYearAgo");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  useLocalStorage(LocalStorageKey.TABLE_SORT_COLUMN, sortColumn);
  useLocalStorage(LocalStorageKey.TABLE_SORT_DIRECTION, sortDirection);

  const statsMatrix = useMemo(
    () => getStatsMatrix(projectsStats, resolvedTheme),
    [projectsStats, resolvedTheme],
  );

  const sortedStatsMatrix = useMemo(
    () => sortStatsMatrix(statsMatrix, sortColumn, sortDirection),
    [sortColumn, sortDirection, statsMatrix],
  );

  const handleSort = useCallback(
    (column: SortColumn) => {
      if (column === sortColumn) {
        setSortDirection(sortDirection === "desc" ? "asc" : "desc");
      } else {
        setSortColumn(column);
        setSortDirection("desc");
      }
    },
    [sortColumn, sortDirection],
  );

  return (
    <div className="relative overflow-x-auto">
      <Table data-sort-column={sortColumn} data-sort-direction={sortDirection}>
        <TableHeader>
          <TableRow>
            <TableHeadSortable
              className="sticky left-0 z-20 w-[100px] min-w-[100px] cursor-pointer bg-slate-100 dark:bg-slate-900 md:w-[200px] md:min-w-[150px]"
              contentClassName="justify-start"
              column="projectName"
              isSorted={sortColumn === "projectName"}
              sortDirection={sortDirection}
              handleSort={handleSort}
            >
              Project name
            </TableHeadSortable>
            <TableHeadSortable
              column="weekly"
              isSorted={sortColumn === "weekly"}
              sortDirection={sortDirection}
              handleSort={handleSort}
            >
              Weekly
            </TableHeadSortable>
            <TableHeadSortable
              column="monthly"
              isSorted={sortColumn === "monthly"}
              sortDirection={sortDirection}
              handleSort={handleSort}
            >
              Monthly
            </TableHeadSortable>
            <TableHeadSortable
              column="yearly"
              isSorted={sortColumn === "yearly"}
              sortDirection={sortDirection}
              handleSort={handleSort}
            >
              Yearly
            </TableHeadSortable>
            <TableHeadSortable
              column="oneYearAgo"
              isSorted={sortColumn === "oneYearAgo"}
              sortDirection={sortDirection}
              handleSort={handleSort}
            >
              Today vs a year ago
            </TableHeadSortable>
            <TableHeadSortable
              column="breakDrop"
              isSorted={sortColumn === "breakDrop"}
              sortDirection={sortDirection}
              handleSort={handleSort}
            >
              <div className="flex items-center gap-1">
                <span>Break Drop</span>
                <SimpleTooltip
                  content={
                    <div className="max-w-xs">
                      <p className="mb-2 text-xs font-medium">
                        Break Drop Indicator
                      </p>
                      <p className="mb-2 text-xs">
                        This indicator may suggest the level of library usage in
                        corporate projects by analyzing download patterns during
                        weekends and Christmas holidays.
                      </p>
                      <p className="mb-2 text-xs">
                        Higher scores indicate potential corporate usage, as
                        business applications, CI/CD pipelines, and automated
                        deployment systems typically show reduced activity
                        during non-business hours and holiday periods when
                        development teams are offline.
                      </p>
                      <div className="text-orange-500 dark:text-orange-500">
                        <ExclamationTriangleIcon className="size-4 min-h-4 min-w-4" />
                        <p className="flex items-center gap-1 text-xs font-medium">
                          Use as a general indicator only. Individual projects
                          may have different usage patterns regardless of their
                          target audience.
                        </p>
                      </div>
                    </div>
                  }
                >
                  <InfoCircledIcon className="size-4 cursor-help text-muted-foreground" />
                </SimpleTooltip>
              </div>
            </TableHeadSortable>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedStatsMatrix.map((projectStats) => (
            <TableRow key={projectStats.projectName}>
              <ProjectNameCell
                projectName={projectStats.projectName}
                color={projectStats.color}
              />
              <TableCellWithStats change={projectStats.weeklyChange} />
              <TableCellWithStats change={projectStats.monthlyChange} />
              <TableCellWithStats change={projectStats.yearlyChange} />
              <TableCellWithStats change={projectStats.oneYearAgoChange} />
              <TableCell>
                <BreakDropIndicatorComponent
                  indicator={projectStats.breakDropIndicator}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

type ProjectNameCellProps = {
  isLoading?: boolean;
  projectName: string;
  color: string | undefined;
};

export function ProjectNameCell({
  isLoading = false,
  projectName,
  color,
}: ProjectNameCellProps) {
  return (
    <TableCell className="sticky left-0 z-10 table-cell cursor-pointer bg-background md:bg-transparent">
      <Loader
        isLoading={isLoading}
        fallback={<Skeleton className="h-4 w-full" />}
      >
        <div className="flex items-center gap-2">
          <DotIndicator color={color} />
          <span className="text-sm">{projectName}</span>
        </div>
      </Loader>
    </TableCell>
  );
}

export default ProjectsStatsTable;
