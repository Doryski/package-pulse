import Loader from "@/components/loader";
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
import { ProjectStats, sortStatsMatrix } from "@/lib/queries/useProjectsStats";
import { ExclamationTriangleIcon } from "@radix-ui/react-icons";
import { UseQueryResult } from "@tanstack/react-query";
import { format } from "date-fns";
import { useTheme } from "next-themes";
import { useCallback, useMemo, useState } from "react";
import getStatsMatrix from "../utils/getStatsMatrix";

const formatMonthPeriod = (period: { start: string; end: string }) => {
  const startMonth = format(period.start, "yyyy-MM");
  const endMonth = format(period.end, "yyyy-MM");
  if (startMonth === endMonth) {
    return format(period.start, "MMMM yyyy");
  }
  return `${startMonth} – ${endMonth}`;
};

const formatYearPeriod = (period: { start: string; end: string }) => {
  const startYear = format(period.start, "yyyy");
  const endYear = format(period.end, "yyyy");
  if (startYear === endYear) {
    return format(period.start, "yyyy");
  }
  return `${startYear} – ${endYear}`;
};

type ProjectStatsQuery = UseQueryResult<ProjectStats, Error>;

type ProjectsStatsTableProps = { projectsStats: ProjectStatsQuery[] };

const ProjectsStatsTable = ({ projectsStats }: ProjectsStatsTableProps) => {
  const { resolvedTheme } = useTheme();
  const [sortColumn, setSortColumn] = useState<SortColumn>("yoyMonth");
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

  const { dates } = statsMatrix;

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
              tooltip={
                <StatHeaderTooltip
                  dates={dates}
                  title="Weekly Downloads Change"
                  recentPeriodKey="recentFullWeek"
                  previousPeriodKey="previousFullWeek"
                  titleOfRecentPeriod="Recent Full Week"
                  titleOfPreviousPeriod="Previous Full Week"
                />
              }
            >
              Weekly
            </TableHeadSortable>
            <TableHeadSortable
              column="monthly"
              isSorted={sortColumn === "monthly"}
              sortDirection={sortDirection}
              handleSort={handleSort}
              tooltip={
                <StatHeaderTooltip
                  dates={dates}
                  title="Monthly Downloads Change"
                  recentPeriodKey="recentFullMonth"
                  previousPeriodKey="previousFullMonth"
                  titleOfRecentPeriod="Recent Full Month"
                  titleOfPreviousPeriod="Previous Full Month"
                  formatter={formatMonthPeriod}
                />
              }
            >
              Monthly
            </TableHeadSortable>
            <TableHeadSortable
              column="yearly"
              isSorted={sortColumn === "yearly"}
              sortDirection={sortDirection}
              handleSort={handleSort}
              tooltip={
                <StatHeaderTooltip
                  dates={dates}
                  title="Yearly Downloads Change"
                  recentPeriodKey="recentFullYear"
                  previousPeriodKey="previousFullYear"
                  titleOfRecentPeriod="Recent Full Year"
                  titleOfPreviousPeriod="Previous Full Year"
                  formatter={formatYearPeriod}
                />
              }
            >
              Yearly
            </TableHeadSortable>
            <TableHeadSortable
              column="yoyWeek"
              isSorted={sortColumn === "yoyWeek"}
              sortDirection={sortDirection}
              handleSort={handleSort}
              tooltip={
                <StatHeaderTooltip
                  dates={dates}
                  title="Year-over-Year Weekly Change"
                  recentPeriodKey="recentFullWeek"
                  previousPeriodKey="lastYearsReferenceWeek"
                  titleOfRecentPeriod="This Year's Recent Full Week"
                  titleOfPreviousPeriod="Last Year's Full Week"
                />
              }
            >
              YoY Week
            </TableHeadSortable>
            <TableHeadSortable
              column="yoyMonth"
              isSorted={sortColumn === "yoyMonth"}
              sortDirection={sortDirection}
              handleSort={handleSort}
              tooltip={
                <StatHeaderTooltip
                  dates={dates}
                  title="Year-over-Year Monthly Change"
                  recentPeriodKey="recentFullMonth"
                  previousPeriodKey="lastYearsReferenceMonth"
                  titleOfRecentPeriod="This Year's Recent Full Month"
                  titleOfPreviousPeriod="Last Year's Full Month"
                  formatter={formatMonthPeriod}
                />
              }
            >
              YoY Month
            </TableHeadSortable>

            <TableHeadSortable
              column="breakDrop"
              isSorted={sortColumn === "breakDrop"}
              sortDirection={sortDirection}
              handleSort={handleSort}
              tooltip={
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
                    deployment systems typically show reduced activity during
                    non-business hours and holiday periods when development
                    teams are offline.
                  </p>
                  <div className="text-orange-500 dark:text-orange-500">
                    <ExclamationTriangleIcon className="size-4 min-h-4 min-w-4" />
                    <p className="flex items-center gap-1 text-xs font-medium">
                      Use as a general indicator only. Individual projects may
                      have different usage patterns regardless of their target
                      audience.
                    </p>
                  </div>
                </div>
              }
            >
              Break Drop
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
              <TableCellWithStats change={projectStats.yoyWeekChange} />
              <TableCellWithStats change={projectStats.yoyMonthChange} />
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
type StatHeaderTooltipProps<T> = {
  dates: T;
  title: string;
  recentPeriodKey: keyof T;
  previousPeriodKey: keyof T;
  titleOfRecentPeriod: string;
  titleOfPreviousPeriod: string;
  formatter?: (period: { start: string; end: string }) => string;
};

const StatHeaderTooltip = <
  T extends Record<string, { start: string; end: string } | undefined>,
>({
  dates,
  title,
  recentPeriodKey,
  previousPeriodKey,
  titleOfRecentPeriod,
  titleOfPreviousPeriod,
  formatter = (period) => `${period.start} – ${period.end}`,
}: StatHeaderTooltipProps<T>) => {
  if (!dates[recentPeriodKey] || !dates[previousPeriodKey]) {
    return null;
  }

  return (
    <div className="max-w-xs space-y-1">
      <div className="text-center">
        <p className="text-sm font-semibold">{title}</p>
      </div>

      <p className="font-medium">{titleOfRecentPeriod}</p>
      <p className="text-xs">{formatter(dates[recentPeriodKey])}</p>

      <p className="font-medium">{titleOfPreviousPeriod}</p>
      <p className="text-xs">{formatter(dates[previousPeriodKey])}</p>
    </div>
  );
};

export default ProjectsStatsTable;
