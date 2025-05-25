import { fetchPackageInfo } from "@/api/fetchPackageInfo";
import { ChartConfig, VersionData } from "@/components/ui/line-chart";
import { ProjectStats } from "@/lib/queries/useProjectsStats";
import { UseQueryResult } from "@tanstack/react-query";
import normalizeProjectName from "./normalizeProjectName";

export default function getChartConfig(
  stats: UseQueryResult<ProjectStats>[],
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
