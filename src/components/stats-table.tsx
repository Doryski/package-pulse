import formatCellValue from "@/lib/utils/formatCellValue";
import formatInteger from "@/lib/utils/formatNominal";
import formatPercentage from "@/lib/utils/formatPercentage";
import getStatsMatrix from "@/lib/utils/getStatsMatrix";
import { UseQueryResult } from "@tanstack/react-query";
import { useTheme } from "next-themes";
import { useMemo, useState } from "react";
import SortableTableHead, {
  SortColumn,
  SortDirection,
} from "./sortable-table-head";
import ArrowIndicator from "./ui/arrow-indicator";
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
  const [sortColumn, setSortColumn] = useState<SortColumn>("weekly");
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

  const handleSort = (column: SortColumn) => {
    if (column === sortColumn) {
      setSortDirection(sortDirection === "desc" ? "asc" : "desc");
    } else {
      setSortColumn(column);
      setSortDirection("desc");
    }
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <SortableTableHead
            className="w-[150px]"
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
            <TableCell className="table-cell">
              <div className="flex items-center gap-2">
                <span className="text-sm">{projectStats.projectName}</span>
                <DotIndicator color={projectStats.color} />
              </div>
            </TableCell>
            <TableCell className="table-cell text-center">
              <div className="flex items-center justify-center gap-2">
                <div className="flex flex-col">
                  <span>
                    {formatCellValue(
                      projectStats.weeklyChange?.nominal,
                      formatInteger,
                    )}
                  </span>
                  <span>
                    {formatCellValue(
                      projectStats.weeklyChange?.percentage,
                      formatPercentage,
                    )}
                  </span>
                </div>
                <ArrowIndicator value={projectStats.weeklyChange?.nominal} />
              </div>
            </TableCell>
            <TableCell className="table-cell text-center">
              <div className="flex items-center justify-center gap-2">
                <div className="flex flex-col">
                  <span>
                    {formatCellValue(
                      projectStats.monthlyChange?.nominal,
                      formatInteger,
                    )}
                  </span>
                  <span>
                    {formatCellValue(
                      projectStats.monthlyChange?.percentage,
                      formatPercentage,
                    )}
                  </span>
                </div>
                <ArrowIndicator value={projectStats.monthlyChange?.nominal} />
              </div>
            </TableCell>
            <TableCell className="table-cell text-center">
              <div className="flex items-center justify-center gap-2">
                <div className="flex flex-col">
                  <span>
                    {formatCellValue(
                      projectStats.yearlyChange?.nominal,
                      formatInteger,
                    )}
                  </span>
                  <span>
                    {formatCellValue(
                      projectStats.yearlyChange?.percentage,
                      formatPercentage,
                    )}
                  </span>
                </div>
                <ArrowIndicator value={projectStats.yearlyChange?.nominal} />
              </div>
            </TableCell>
            <TableCell className="table-cell text-center">
              <div className="flex items-center justify-center gap-2">
                <div className="flex flex-col">
                  <span>
                    {formatCellValue(
                      projectStats.oneYearAgoChange?.nominal,
                      formatInteger,
                    )}
                  </span>
                  <span>
                    {formatCellValue(
                      projectStats.oneYearAgoChange?.percentage,
                      formatPercentage,
                    )}
                  </span>
                </div>
                <ArrowIndicator
                  value={projectStats.oneYearAgoChange?.nominal}
                />
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

export default ProjectsStatsTable;
