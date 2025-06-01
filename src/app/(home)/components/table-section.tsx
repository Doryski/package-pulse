import { Button } from "@/components/ui/button";
import {
  SortColumnSchema,
  SortDirectionSchema,
} from "@/components/ui/table-head-sortable";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import LocalStorageKey from "@/lib/enums/LocalStorageKey";
import useBooleanState from "@/lib/hooks/useBooleanState";
import useStatsMatrix from "@/lib/hooks/useStatsMatrix";
import usePackagesInfo from "@/lib/queries/usePackagesInfo";
import {
  ProjectStatsQuery,
  sortStatsMatrix,
} from "@/lib/queries/useProjectsStats";
import { cn } from "@/lib/utils/cn";
import { exportCsv } from "@/lib/utils/exportUtils";
import getLocalStorageValue from "@/lib/utils/getLocalStorageValue";
import {
  BarChartIcon,
  DownloadIcon,
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
    breakDropPercentage: number;
    weekendDropPercentage: number;
    corporateUsageScore: number;
    corporateUsageLevel: string;
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
  };
  const data = sortedStatsMatrix.reduce<StatsRow[]>((acc, project) => {
    let itemData: StatsRow = {
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
      breakDropPercentage: project.breakDropIndicator.christmasDropPercentage,
      weekendDropPercentage: project.breakDropIndicator.weekendDropPercentage,
      corporateUsageScore: project.breakDropIndicator.corporateUsageScore,
      corporateUsageLevel: project.breakDropIndicator.corporateUsageLevel,
      repoName: null,
      latestVersion: null,
      lastReleaseDate: null,
      contributorsCount: null,
      dependenciesCount: null,
      devDependenciesCount: null,
      homepage: null,
      license: null,
      repositoryUrl: null,
      description: null,
      createdAt: null,
    };
    const foundProjectInfo = projectsInfo.find(
      (p) => p.data?.projectName === project.projectName,
    );
    if (foundProjectInfo?.isSuccess) {
      const projectInfo = foundProjectInfo.data;
      itemData = {
        ...itemData,
        repoName: projectInfo.repoName,
        latestVersion: projectInfo.latestVersion?.version ?? null,
        lastReleaseDate: projectInfo.lastReleaseDate ?? null,
        contributorsCount: projectInfo.contributorsCount ?? null,
        dependenciesCount: projectInfo.dependenciesCount ?? null,
        devDependenciesCount: projectInfo.devDependenciesCount ?? null,
        homepage: projectInfo.homepage ?? null,
        license: projectInfo.license ?? null,
        repositoryUrl: projectInfo.repositoryUrl ?? null,
        description: projectInfo.description ?? null,
        createdAt: projectInfo.createdAt ?? null,
      };
    }
    return [...acc, itemData];
  }, []);

  const exportToFile = () => {
    const timestamp = new Date().getTime();
    const filename = `package-pulse-${timestamp}`;

    return exportCsv(filename, data);
  };

  return exportToFile;
}

const TableSection = memo(({ projectsStats }: TableSectionProps) => {
  const exportToFile = useExportData(projectsStats);
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
      <div className="relative flex justify-end">
        <h3 className="absolute left-1/2 top-0 -translate-x-1/2 text-center text-lg">
          Downloads by project
        </h3>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="flex items-center gap-2"
            onClick={exportToFile}
          >
            CSV
            <DownloadIcon className="size-4" />
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
