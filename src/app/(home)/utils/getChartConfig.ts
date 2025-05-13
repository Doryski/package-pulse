import { fetchPackageInfo } from "@/api/fetchPackageInfo";
import { ChartConfig, VersionData } from "@/components/ui/line-chart";
import { UseQueryResult } from "@tanstack/react-query";
import { SelectedProjectsStatsQueries } from "../types/selected-projects-stats-queries";
import normalizeProjectName from "./normalizeProjectName";

export default function getChartConfig(
  stats: SelectedProjectsStatsQueries,
  packagesInfo: UseQueryResult<
    Awaited<ReturnType<typeof fetchPackageInfo>>,
    Error
  >[],
): ChartConfig {
  return stats.reduce((acc, query, index) => {
    const projectName = query.data?.projectName;
    if (!projectName) {
      return acc;
    }
    const normalizedName = normalizeProjectName(projectName);
    let versions: VersionData[] = [];
    const packageInfo = packagesInfo?.[index]?.data;
    if (packageInfo) {
      versions = packageInfo.versions.map((version) => ({
        version: version.version,
        date: version.date,
      }));
    }

    return {
      ...acc,
      [normalizedName]: {
        label: projectName,
        color: `hsl(var(--chart-${index + 1}))`,
        versions,
      },
    };
  }, {});
}
