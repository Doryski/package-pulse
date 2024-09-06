import formatCellValue from "@/lib/utils/formatCellValue";
import formatInteger from "@/lib/utils/formatNominal";
import formatPercentage from "@/lib/utils/formatPercentage";
import getStatsMatrix from "@/lib/utils/getStatsMatrix";
import { UseQueryResult } from "@tanstack/react-query";
import { useTheme } from "next-themes";
import { useMemo } from "react";
import ArrowIndicator from "./ui/arrow-indicator";
import DotIndicator from "./ui/dot-indicator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";

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
  const processedProjectsTableStats = useMemo(
    () => getStatsMatrix(projectsStats, theme),
    [projectsStats, theme],
  );

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[150px]">Project name</TableHead>
          <TableHead className="text-center">Weekly</TableHead>
          <TableHead className="text-center">Monthly</TableHead>
          <TableHead className="text-center">Yearly</TableHead>
          <TableHead className="text-center">Today vs a year ago</TableHead>
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
