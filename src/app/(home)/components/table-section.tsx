import type { BundleSize, DepsDevInfo, PackageInfo } from "@/api/packageData";
import { StatsRow } from "@/app/(home)/utils/getStatsMatrix";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SortColumn, SortDirection } from "@/components/ui/table-head-sortable";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import useBooleanState from "@/lib/hooks/useBooleanState";
import useStatsMatrix from "@/lib/hooks/useStatsMatrix";
import useTableSort from "@/lib/hooks/useTableSort";
import { bundleSizeQueryOptions } from "@/lib/queries/useBundleSize";
import { depsDevQueryOptions } from "@/lib/queries/useDepsDev";
import { packageInfoQueryOptions } from "@/lib/queries/usePackagesInfo";
import usePendingProjectsStatsCount from "@/lib/queries/usePendingProjectsStatsCount";
import {
  ProjectStatsQuery,
  sortStatsMatrix,
} from "@/lib/queries/useProjectsStats";
import { cn } from "@/lib/utils/cn";
import { exportCsv, exportJson } from "@/lib/utils/exportUtils";
import { ChartColumn, Download, FileText, Info } from "lucide-react";
import { QueryClient, useQueryClient } from "@tanstack/react-query";
import { memo, useMemo } from "react";
import { useWatch } from "react-hook-form";
import { ProjectsSearchFormValues } from "./projects-form/schema";
import { STICKY_NAME_CELL_CLASS_NAME } from "./project-name-cell";
import ProjectsInfoTable from "./projects-info-table";
import ProjectsStatsTable from "./projects-stats-table";
import {
  STICKY_HEAD_CLASS_NAME,
  statsTableColumns,
} from "./stats-table-columns";

type TableSectionProps = {
  projectsStats: ProjectStatsQuery[];
};

type ExportSort = {
  sortColumn: SortColumn;
  sortDirection: SortDirection;
};

type ExportSources = {
  projectInfo: PackageInfo | null;
  bundleSize: BundleSize | null;
  depsDevInfo: DepsDevInfo | null;
};

const toExportFilename = () => `package-pulse-${new Date().getTime()}`;

const fetchOrNull = <T,>(promise: Promise<T>) => promise.catch(() => null);

const fetchBundleSize = (
  queryClient: QueryClient,
  projectName: string,
  version: string | null | undefined,
) => {
  if (!version) return Promise.resolve(null);
  return fetchOrNull(
    queryClient.fetchQuery(bundleSizeQueryOptions(projectName, version)),
  );
};

const fetchExportSources = async (
  queryClient: QueryClient,
  projectName: string,
): Promise<ExportSources> => {
  const [projectInfo, depsDevInfo] = await Promise.all([
    fetchOrNull(queryClient.fetchQuery(packageInfoQueryOptions(projectName))),
    fetchOrNull(queryClient.fetchQuery(depsDevQueryOptions(projectName))),
  ]);
  const bundleSize = await fetchBundleSize(
    queryClient,
    projectName,
    projectInfo?.latestVersion,
  );
  return { projectInfo, bundleSize, depsDevInfo };
};

const toDepsDevLicenses = (depsDevInfo: DepsDevInfo | null) => {
  if (!Array.isArray(depsDevInfo?.licenses)) return null;
  return depsDevInfo.licenses.join(", ");
};

const toExportRow = (
  project: StatsRow,
  { projectInfo, bundleSize, depsDevInfo }: ExportSources,
) => ({
  projectName: project.projectName,
  weeklyChange_nominal: project.weeklyChange?.nominal ?? null,
  weeklyChange_percentage: project.weeklyChange?.percentage ?? null,
  monthlyChange_nominal: project.monthlyChange?.nominal ?? null,
  monthlyChange_percentage: project.monthlyChange?.percentage ?? null,
  yearlyChange_nominal: project.yearlyChange?.nominal ?? null,
  yearlyChange_percentage: project.yearlyChange?.percentage ?? null,
  yoyWeekChange_nominal: project.yoyWeekChange?.nominal ?? null,
  yoyWeekChange_percentage: project.yoyWeekChange?.percentage ?? null,
  yoyMonthChange_nominal: project.yoyMonthChange?.nominal ?? null,
  yoyMonthChange_percentage: project.yoyMonthChange?.percentage ?? null,
  breakDropPercentage:
    project.breakDropIndicator.christmasDropPercentage ?? null,
  weekendDropPercentage: project.breakDropIndicator.weekendDropPercentage,
  corporateUsageScore: project.breakDropIndicator.corporateUsageScore ?? null,
  corporateUsageLevel: project.breakDropIndicator.corporateUsageLevel ?? null,
  repoName: projectInfo?.repoName ?? null,
  latestVersion: projectInfo?.latestVersion ?? null,
  lastReleaseDate: projectInfo?.lastReleaseDate ?? null,
  contributorsCount: projectInfo?.contributorsCount ?? null,
  dependenciesCount: projectInfo?.dependenciesCount ?? null,
  devDependenciesCount: projectInfo?.devDependenciesCount ?? null,
  homepage: projectInfo?.homepage ?? null,
  license: projectInfo?.license ?? null,
  repositoryUrl: projectInfo?.repositoryUrl ?? null,
  description: projectInfo?.description ?? null,
  createdAt: projectInfo?.createdAt ?? null,
  bundleSizeMin: bundleSize?.size ?? null,
  bundleSizeGzip: bundleSize?.gzip ?? null,
  treeShakeable: bundleSize?.treeShakeable ?? null,
  dependencyCount: bundleSize?.dependencyCount ?? null,
  vulnerabilityCount: depsDevInfo?.vulnerabilityCount ?? null,
  healthScore: depsDevInfo?.healthScore ?? null,
  depsDevLicenses: toDepsDevLicenses(depsDevInfo),
});

const buildExportData = async (queryClient: QueryClient, rows: StatsRow[]) => {
  const sources = await Promise.all(
    rows.map((row) => fetchExportSources(queryClient, row.projectName)),
  );
  return rows.map((row, index) => toExportRow(row, sources[index]!));
};

function useExportData(
  projectsStats: ProjectStatsQuery[],
  { sortColumn, sortDirection }: ExportSort,
) {
  const queryClient = useQueryClient();
  const statsMatrix = useStatsMatrix(projectsStats);
  const sortedStatsMatrix = useMemo(
    () => sortStatsMatrix(statsMatrix, sortColumn, sortDirection),
    [sortColumn, sortDirection, statsMatrix],
  );

  const exportToCsv = async () => {
    const filename = toExportFilename();
    await exportCsv(
      filename,
      await buildExportData(queryClient, sortedStatsMatrix),
    );
  };

  const exportToJson = async () => {
    const filename = toExportFilename();
    await exportJson(
      filename,
      await buildExportData(queryClient, sortedStatsMatrix),
    );
  };

  return { exportToCsv, exportToJson };
}

const StatsTableSkeleton = ({ rowCount }: { rowCount: number }) => (
  <div className="relative overflow-x-auto" data-testid="stats-table-skeleton">
    <Table>
      <TableHeader>
        <TableRow>
          {statsTableColumns.map(({ column, label, isSticky }) => (
            <TableHead
              key={column}
              className={cn(
                "text-center",
                isSticky && cn(STICKY_HEAD_CLASS_NAME, "text-left"),
              )}
            >
              {label}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {Array.from({ length: rowCount }, (_, rowIndex) => (
          <TableRow key={rowIndex}>
            {statsTableColumns.map(({ column, isSticky }) => (
              <TableCell
                key={column}
                className={cn(isSticky && STICKY_NAME_CELL_CLASS_NAME)}
              >
                <Skeleton aria-hidden className="h-4 w-full" />
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </div>
);

type StatsViewProps = {
  projectsStats: ProjectStatsQuery[];
  pendingCount: number;
  sortColumn: SortColumn;
  sortDirection: SortDirection;
  onSort: (column: SortColumn) => void;
};

const StatsView = ({
  projectsStats,
  pendingCount,
  ...sort
}: StatsViewProps) => {
  if (projectsStats.length === 0 && pendingCount > 0) {
    return <StatsTableSkeleton rowCount={pendingCount} />;
  }
  return <ProjectsStatsTable projectsStats={projectsStats} {...sort} />;
};

const TableSection = memo(({ projectsStats }: TableSectionProps) => {
  const selectedProjects = useWatch<ProjectsSearchFormValues, "projects">({
    name: "projects",
  });
  const pendingCount = usePendingProjectsStatsCount(selectedProjects);
  const { sortColumn, sortDirection, handleSort } = useTableSort();
  const { exportToCsv, exportToJson } = useExportData(projectsStats, {
    sortColumn,
    sortDirection,
  });
  const [isInfoTableVisible, showInfoTable, hideInfoTable] =
    useBooleanState(false);
  const hasStats = projectsStats.length > 0;
  const isSkeletonVisible = !hasStats && pendingCount > 0;

  const handleToggleChange = (value: string) => {
    if (!value) return;
    if (value === "info") {
      showInfoTable();
    } else {
      hideInfoTable();
    }
  };

  return (
    <div
      className={cn(
        "mt-4 size-full md:mt-8 lg:mt-16",
        !hasStats && !isSkeletonVisible && "hidden",
      )}
      aria-busy={isSkeletonVisible || undefined}
    >
      <div className="relative flex w-full flex-wrap items-center justify-between gap-2 lg:justify-end">
        <h3 className="text-center text-sm sm:text-lg lg:absolute lg:top-0 lg:left-1/2 lg:-translate-x-1/2">
          Downloads by project
        </h3>
        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="outline"
            className="flex items-center gap-2"
            disabled={!hasStats}
            onClick={() => void exportToCsv()}
          >
            CSV
            <Download className="size-4" />
          </Button>
          <Button
            variant="outline"
            className="flex items-center gap-2"
            disabled={!hasStats}
            onClick={() => void exportToJson()}
          >
            JSON
            <FileText className="size-4" />
          </Button>
          <ToggleGroup
            type="single"
            aria-label="Table view"
            onValueChange={handleToggleChange}
            value={isInfoTableVisible ? "info" : "stats"}
          >
            <ToggleGroupItem value="stats" aria-label="Toggle stats">
              <ChartColumn className="size-4" />
            </ToggleGroupItem>
            <ToggleGroupItem value="info" aria-label="Toggle info">
              <Info className="size-4" />
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </div>
      <div className="mt-1 md:mt-2">
        {isInfoTableVisible ? (
          <ProjectsInfoTable />
        ) : (
          <StatsView
            projectsStats={projectsStats}
            pendingCount={pendingCount}
            sortColumn={sortColumn}
            sortDirection={sortDirection}
            onSort={handleSort}
          />
        )}
      </div>
    </div>
  );
});

TableSection.displayName = "TableSection";

export default TableSection;
