import DotIndicator from "@/components/ui/dot-indicator";
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

  const processedProjectsTableStats = useMemo(() => {
    const stats = getStatsMatrix(projectsStats, resolvedTheme);
    return stats.toSorted((a, b) => {
      if (sortColumn === "projectName") {
        return sortDirection === "desc"
          ? b.projectName.localeCompare(a.projectName)
          : a.projectName.localeCompare(b.projectName);
      } else {
        const aValue = a[`${sortColumn}Change`]?.percentage ?? 0;
        const bValue = b[`${sortColumn}Change`]?.percentage ?? 0;
        return sortDirection === "desc" ? bValue - aValue : aValue - bValue;
      }
    });
  }, [projectsStats, resolvedTheme, sortColumn, sortDirection]);

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
      <Table>
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
          </TableRow>
        </TableHeader>
        <TableBody>
          {processedProjectsTableStats.map((projectStats) => (
            <TableRow key={projectStats.projectName}>
              <TableCell className="sticky left-0 z-10 table-cell cursor-pointer bg-background md:bg-transparent">
                <div className="flex items-center gap-2">
                  <DotIndicator color={projectStats.color} />
                  <span className="text-sm">{projectStats.projectName}</span>
                </div>
              </TableCell>
              <TableCellWithStats change={projectStats.weeklyChange} />
              <TableCellWithStats change={projectStats.monthlyChange} />
              <TableCellWithStats change={projectStats.yearlyChange} />
              <TableCellWithStats change={projectStats.oneYearAgoChange} />
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default ProjectsStatsTable;
