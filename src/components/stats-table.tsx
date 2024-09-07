import getStatsMatrix from "@/lib/utils/getStatsMatrix";
import { UseQueryResult } from "@tanstack/react-query";
import { useTheme } from "next-themes";
import { useCallback, useMemo, useState } from "react";
import SortableTableHead, {
  SortColumn,
  SortDirection,
} from "./sortable-table-head";
import TableCellWithStats from "./table-cell-with-stats";
import DotIndicator from "./ui/dot-indicator";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "./ui/table";

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
  const { theme } = useTheme();
  const [sortColumn, setSortColumn] = useState<SortColumn>("oneYearAgo");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const processedProjectsTableStats = useMemo(() => {
    const stats = getStatsMatrix(projectsStats, theme);
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
  }, [projectsStats, theme, sortColumn, sortDirection]);

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
            <SortableTableHead
              className="sticky left-0 z-20 w-[250px] min-w-[150px] cursor-pointer"
              column="projectName"
              isSorted={sortColumn === "projectName"}
              sortDirection={sortDirection}
              handleSort={handleSort}
            >
              Project name
            </SortableTableHead>
            <SortableTableHead
              column="weekly"
              isSorted={sortColumn === "weekly"}
              sortDirection={sortDirection}
              handleSort={handleSort}
            >
              Weekly
            </SortableTableHead>
            <SortableTableHead
              column="monthly"
              isSorted={sortColumn === "monthly"}
              sortDirection={sortDirection}
              handleSort={handleSort}
            >
              Monthly
            </SortableTableHead>
            <SortableTableHead
              column="yearly"
              isSorted={sortColumn === "yearly"}
              sortDirection={sortDirection}
              handleSort={handleSort}
            >
              Yearly
            </SortableTableHead>
            <SortableTableHead
              column="oneYearAgo"
              isSorted={sortColumn === "oneYearAgo"}
              sortDirection={sortDirection}
              handleSort={handleSort}
            >
              Today vs a year ago
            </SortableTableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {processedProjectsTableStats.map((projectStats) => (
            <TableRow key={projectStats.projectName}>
              <TableCell className="sticky left-0 z-10 table-cell cursor-pointer">
                <div className="flex items-center gap-2">
                  <span className="text-sm">{projectStats.projectName}</span>
                  <DotIndicator color={projectStats.color} />
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
