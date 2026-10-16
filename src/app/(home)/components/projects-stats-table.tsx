import BreakDropIndicatorComponent from "@/components/ui/break-drop-indicator";
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
import useStatsMatrix from "@/lib/hooks/useStatsMatrix";
import { ProjectStats, sortStatsMatrix } from "@/lib/queries/useProjectsStats";
import { cn } from "@/lib/utils/cn";
import { TriangleAlert } from "lucide-react";
import { UseQueryResult } from "@tanstack/react-query";
import { format } from "date-fns";
import { useMemo } from "react";
import { ProjectNameCell } from "./project-name-cell";
import {
  STICKY_HEAD_CLASS_NAME,
  statsColumnLabel,
} from "./stats-table-columns";

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

type ProjectsStatsTableProps = {
  projectsStats: ProjectStatsQuery[];
  sortColumn: SortColumn;
  sortDirection: SortDirection;
  onSort: (column: SortColumn) => void;
};

const ProjectsStatsTable = ({
  projectsStats,
  sortColumn,
  sortDirection,
  onSort: handleSort,
}: ProjectsStatsTableProps) => {
  const statsMatrix = useStatsMatrix(projectsStats);

  const sortedStatsMatrix = useMemo(
    () => sortStatsMatrix(statsMatrix, sortColumn, sortDirection),
    [sortColumn, sortDirection, statsMatrix],
  );

  const { dates } = statsMatrix;

  return (
    <div className="relative overflow-x-auto">
      <Table data-sort-column={sortColumn} data-sort-direction={sortDirection}>
        <TableHeader>
          <TableRow>
            <TableHeadSortable
              className={cn(STICKY_HEAD_CLASS_NAME, "cursor-pointer")}
              contentClassName="justify-start"
              column="projectName"
              isSorted={sortColumn === "projectName"}
              sortDirection={sortDirection}
              handleSort={handleSort}
            >
              {statsColumnLabel("projectName")}
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
              {statsColumnLabel("weekly")}
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
              {statsColumnLabel("monthly")}
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
              {statsColumnLabel("yearly")}
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
              {statsColumnLabel("yoyWeek")}
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
              {statsColumnLabel("yoyMonth")}
            </TableHeadSortable>

            <TableHeadSortable
              column="vibeCodingEra"
              isSorted={sortColumn === "vibeCodingEra"}
              sortDirection={sortDirection}
              handleSort={handleSort}
              tooltip={
                <StatHeaderTooltip
                  dates={dates}
                  title="Vibe Coding Era Change"
                  recentPeriodKey="recentFullWeek"
                  previousPeriodKey="vibeCodingEraReferenceWeek"
                  titleOfRecentPeriod="Recent Full Week"
                  titleOfPreviousPeriod="Vibe Coding Era Start Week"
                  description={
                    <p className="text-xs">
                      The &quot;Vibe Coding Era&quot; began when tools like
                      Bolt, Lovable, and others were released and started
                      trending.
                    </p>
                  }
                />
              }
            >
              {statsColumnLabel("vibeCodingEra")}
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
                    <TriangleAlert className="size-4 min-h-4 min-w-4" />
                    <p className="flex items-center gap-1 text-xs font-medium">
                      Use as a general indicator only. Individual projects may
                      have different usage patterns regardless of their target
                      audience.
                    </p>
                  </div>
                </div>
              }
            >
              {statsColumnLabel("breakDrop")}
            </TableHeadSortable>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedStatsMatrix.map((projectStats) => (
            <TableRow key={projectStats.projectName}>
              <ProjectNameCell
                className="cursor-pointer"
                projectName={projectStats.projectName}
                color={projectStats.color}
              />
              <TableCellWithStats change={projectStats.weeklyChange} />
              <TableCellWithStats change={projectStats.monthlyChange} />
              <TableCellWithStats change={projectStats.yearlyChange} />
              <TableCellWithStats change={projectStats.yoyWeekChange} />
              <TableCellWithStats change={projectStats.yoyMonthChange} />
              <TableCellWithStats change={projectStats.vibeCodingEraChange} />
              <TableCell className="min-w-[175px]">
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

type StatHeaderTooltipProps<T> = {
  dates: T;
  title: string;
  recentPeriodKey: keyof T;
  previousPeriodKey: keyof T;
  titleOfRecentPeriod: string;
  titleOfPreviousPeriod: string;
  formatter?: (period: { start: string; end: string }) => string;
  description?: React.ReactNode;
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
  description,
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
      {description}
    </div>
  );
};

export default ProjectsStatsTable;
