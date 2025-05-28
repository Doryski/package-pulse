import { Button } from "@/components/ui/button";
import {
  SortColumnSchema,
  SortDirectionSchema,
} from "@/components/ui/table-head-sortable";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import LocalStorageKey from "@/lib/enums/LocalStorageKey";
import useBooleanState from "@/lib/hooks/useBooleanState";
import usePackagesInfo from "@/lib/queries/usePackagesInfo";
import useProjectsStats, {
  processProjectsStats,
} from "@/lib/queries/useProjectsStats";
import { cn } from "@/lib/utils/cn";
import { exportCsv } from "@/lib/utils/exportUtils";
import getLocalStorageValue from "@/lib/utils/getLocalStorageValue";
import {
  BarChartIcon,
  DownloadIcon,
  InfoCircledIcon,
} from "@radix-ui/react-icons";
import { UseQueryResult } from "@tanstack/react-query";
import { useTheme } from "next-themes";
import { memo } from "react";
import { useFormContext, UseFormReturn } from "react-hook-form";
import { ProjectsSearchFormValues } from "./projects-form/schema";
import ProjectsInfoTable from "./projects-info-table";
import ProjectsStatsTable from "./projects-stats-table";

type TableSectionProps = {
  projectsStats: UseQueryResult<
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
  >[];
};

function useExportData(
  selectedProjects: string[],
  form: UseFormReturn<ProjectsSearchFormValues>,
) {
  const { resolvedTheme } = useTheme();
  const projectsStats = useProjectsStats(selectedProjects, form);
  const sortColumn = getLocalStorageValue(
    LocalStorageKey.TABLE_SORT_COLUMN,
    SortColumnSchema,
  );
  const sortDirection = getLocalStorageValue(
    LocalStorageKey.TABLE_SORT_DIRECTION,
    SortDirectionSchema,
  );
  const processedProjectsStats = processProjectsStats(
    projectsStats,
    resolvedTheme,
    sortColumn ?? "projectName",
    sortDirection ?? "asc",
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
    oneYearAgoChange_nominal: number | null;
    oneYearAgoChange_percentage: number | null;
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
  const data = processedProjectsStats.reduce<StatsRow[]>((acc, project) => {
    let itemData: StatsRow = {
      projectName: project.projectName,
      weeklyChange_nominal: project.weeklyChange?.nominal ?? 0,
      weeklyChange_percentage: project.weeklyChange?.percentage ?? 0,
      monthlyChange_nominal: project.monthlyChange?.nominal ?? 0,
      monthlyChange_percentage: project.monthlyChange?.percentage ?? 0,
      yearlyChange_nominal: project.yearlyChange?.nominal ?? 0,
      yearlyChange_percentage: project.yearlyChange?.percentage ?? 0,
      oneYearAgoChange_nominal: project.oneYearAgoChange?.nominal ?? 0,
      oneYearAgoChange_percentage: project.oneYearAgoChange?.percentage ?? 0,
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
  const form = useFormContext<ProjectsSearchFormValues>();
  const selectedProjects = form.watch("projects");
  const exportToFile = useExportData(selectedProjects, form);
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
      <div className="flex justify-between">
        <div />
        <h3 className="text-center">NPM downloads change by project</h3>
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
