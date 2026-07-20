import { Button } from "@/components/ui/button";
import {
  SortColumnSchema,
  SortDirectionSchema,
} from "@/components/ui/table-head-sortable";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import LocalStorageKey from "@/lib/enums/LocalStorageKey";
import useBooleanState from "@/lib/hooks/useBooleanState";
import useStatsMatrix from "@/lib/hooks/useStatsMatrix";
import useBundleSize from "@/lib/queries/useBundleSize";
import useDepsDev from "@/lib/queries/useDepsDev";
import usePackagesInfo from "@/lib/queries/usePackagesInfo";
import {
  ProjectStatsQuery,
  sortStatsMatrix,
} from "@/lib/queries/useProjectsStats";
import { cn } from "@/lib/utils/cn";
import { exportCsv, exportJson } from "@/lib/utils/exportUtils";
import getLocalStorageValue from "@/lib/utils/getLocalStorageValue";
import {
  BarChartIcon,
  DownloadIcon,
  FileTextIcon,
  InfoCircledIcon,
} from "@radix-ui/react-icons";
import { memo, useMemo } from "react";
import { useFormContext } from "react-hook-form";
import { ProjectsSearchFormValues } from "./projects-form/schema";
import ProjectsInfoTable from "./projects-info-table";
import ProjectsStatsTable from "./projects-stats-table";

type TableSectionProps = {
  projectsStats: ProjectStatsQuery[];
};

function useExportData(projectsStats: ProjectStatsQuery[]) {
  const form = useFormContext<ProjectsSearchFormValues>();
  const selectedProjects = form.watch("projects");
  const statsMatrix = useStatsMatrix(projectsStats);
  const sortColumn = getLocalStorageValue(
    LocalStorageKey.TABLE_SORT_COLUMN,
    SortColumnSchema,
  );
  const sortDirection = getLocalStorageValue(
    LocalStorageKey.TABLE_SORT_DIRECTION,
    SortDirectionSchema,
  );
  const sortedStatsMatrix = useMemo(
    () =>
      sortStatsMatrix(
        statsMatrix,
        sortColumn ?? "projectName",
        sortDirection ?? "asc",
      ),
    [sortColumn, sortDirection, statsMatrix],
  );
  const projectsInfo = usePackagesInfo(selectedProjects);
  const bundleSizes = useBundleSize(selectedProjects);
  const depsDev = useDepsDev(selectedProjects);

  const bundleSizeByName = new Map(
    selectedProjects.map((name, index) => [name, bundleSizes[index]?.data]),
  );
  const depsDevByName = new Map(
    selectedProjects.map((name, index) => [name, depsDev[index]?.data]),
  );

  type StatsRow = {
    projectName: string;
    weeklyChange_nominal: number | null;
    weeklyChange_percentage: number | null;
    monthlyChange_nominal: number | null;
    monthlyChange_percentage: number | null;
    yearlyChange_nominal: number | null;
    yearlyChange_percentage: number | null;
    yoyWeekChange_nominal: number | null;
    yoyWeekChange_percentage: number | null;
    yoyMonthChange_nominal: number | null;
    yoyMonthChange_percentage: number | null;
    breakDropPercentage: number | null;
    weekendDropPercentage: number | null;
    corporateUsageScore: number | null;
    corporateUsageLevel: string | null;
    repoName: string | null;
    latestVersion: string | null;
    lastReleaseDate: string | null;
    contributorsCount: number | null;
    dependenciesCount: number | null;
    devDependenciesCount: number | null;
    homepage: string | null;
    license: string | null;
    repositoryUrl: string | null;
    description: string | null;
    createdAt: string | null;
    bundleSizeMin: number | null;
    bundleSizeGzip: number | null;
    treeShakeable: boolean | null;
    dependencyCount: number | null;
    vulnerabilityCount: number | null;
    healthScore: number | null;
    depsDevLicenses: string | null;
  };
  const buildExportData = (): StatsRow[] =>
    sortedStatsMatrix.map((project) => {
      const foundProjectInfo = projectsInfo.find(
        (p) => p.data?.projectName === project.projectName,
      );
      const projectInfo = foundProjectInfo?.isSuccess
        ? foundProjectInfo.data
        : null;

      const bundleSize = bundleSizeByName.get(project.projectName) ?? null;
      const depsDevInfo = depsDevByName.get(project.projectName) ?? null;

      return {
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
        corporateUsageScore:
          project.breakDropIndicator.corporateUsageScore ?? null,
        corporateUsageLevel:
          project.breakDropIndicator.corporateUsageLevel ?? null,
        repoName: projectInfo?.repoName ?? null,
        latestVersion: projectInfo?.latestVersion?.version ?? null,
        lastReleaseDate: projectInfo?.lastReleaseDate ?? null,
        contributorsCount: projectInfo?.contributorsCount ?? null,
        dependenciesCount: projectInfo?.dependenciesCount ?? null,
        devDependenciesCount: projectInfo?.devDependenciesCount ?? null,
        homepage: projectInfo?.homepage ?? null,
        license: Array.isArray(projectInfo?.license)
          ? projectInfo.license.join(", ")
          : (projectInfo?.license ?? null),
        repositoryUrl: projectInfo?.repositoryUrl ?? null,
        description: projectInfo?.description ?? null,
        createdAt: projectInfo?.createdAt ?? null,
        bundleSizeMin: bundleSize?.size ?? null,
        bundleSizeGzip: bundleSize?.gzip ?? null,
        treeShakeable: bundleSize?.treeShakeable ?? null,
        dependencyCount: bundleSize?.dependencyCount ?? null,
        vulnerabilityCount: depsDevInfo?.vulnerabilityCount ?? null,
        healthScore: depsDevInfo?.healthScore ?? null,
        depsDevLicenses: Array.isArray(depsDevInfo?.licenses)
          ? depsDevInfo.licenses.join(", ")
          : null,
      };
    });

  const exportToCsv = () => {
    const timestamp = new Date().getTime();
    const filename = `package-pulse-${timestamp}`;

    return exportCsv(filename, buildExportData());
  };

  const exportToJson = () => {
    const timestamp = new Date().getTime();
    const filename = `package-pulse-${timestamp}`;

    return exportJson(filename, buildExportData());
  };

  return { exportToCsv, exportToJson };
}

const TableSection = memo(({ projectsStats }: TableSectionProps) => {
  const { exportToCsv, exportToJson } = useExportData(projectsStats);
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
      <div className="relative flex w-full items-center justify-between sm:justify-end">
        <h3 className="text-center text-sm sm:absolute sm:left-1/2 sm:top-0 sm:-translate-x-1/2 sm:text-lg">
          Downloads by project
        </h3>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="flex items-center gap-2"
            onClick={exportToCsv}
          >
            CSV
            <DownloadIcon className="size-4" />
          </Button>
          <Button
            variant="outline"
            className="flex items-center gap-2"
            onClick={exportToJson}
          >
            JSON
            <FileTextIcon className="size-4" />
          </Button>
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
