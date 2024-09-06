import formatCellValue from "@/lib/utils/formatCellValue";
import formatInteger from "@/lib/utils/formatNominal";
import formatPercentage from "@/lib/utils/formatPercentage";
import getStatsMatrix from "@/lib/utils/getStatsMatrix";
import { UseQueryResult } from "@tanstack/react-query";
import { useMemo } from "react";
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
  const processedProjectsTableStats = useMemo(
    () => getStatsMatrix(projectsStats),
    [projectsStats],
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
            <TableCell>{projectStats.projectName}</TableCell>
            <TableCell className="text-center">
              <span>
                {formatCellValue(
                  projectStats.weeklyChange?.nominal,
                  formatInteger,
                )}
              </span>
              <br />
              <span>
                {formatCellValue(
                  projectStats.weeklyChange?.percentage,
                  formatPercentage,
                )}
              </span>
            </TableCell>
            <TableCell className="text-center">
              <span>
                {formatCellValue(
                  projectStats.monthlyChange?.nominal,
                  formatInteger,
                )}
              </span>
              <br />
              <span>
                {formatCellValue(
                  projectStats.monthlyChange?.percentage,
                  formatPercentage,
                )}
              </span>
            </TableCell>
            <TableCell className="text-center">
              <span>
                {formatCellValue(
                  projectStats.yearlyChange?.nominal,
                  formatInteger,
                )}
              </span>
              <br />
              <span>
                {formatCellValue(
                  projectStats.yearlyChange?.percentage,
                  formatPercentage,
                )}
              </span>
            </TableCell>
            <TableCell className="text-center">
              <span>
                {formatCellValue(
                  projectStats.oneYearAgoChange?.nominal,
                  formatInteger,
                )}
              </span>
              <br />
              <span>
                {formatCellValue(
                  projectStats.oneYearAgoChange?.percentage,
                  formatPercentage,
                )}
              </span>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

export default ProjectsStatsTable;
