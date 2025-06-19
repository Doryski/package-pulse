import { SELECTED_PROJECTS_LIMIT } from "@/lib/config/constants";
import { ChartScale } from "@/lib/enums/ChartScale";
import { TimePeriod } from "@/lib/enums/TimePeriod";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import LocalStorageKey from "../../../lib/enums/LocalStorageKey";
import getLocalStorageValue from "../../../lib/utils/getLocalStorageValue";
import { ProjectsSearchFormSchema } from "../components/projects-form/schema";

export const encodeProjectName = (name: string) =>
  encodeURIComponent(name)
    .replace(/%2C/g, ",")
    .replace(/%40/g, "@")
    .replace(/%2F/g, "/");
export const decodeProjectName = (name: string) => decodeURIComponent(name);

export function getInitialProjects(
  projectsParam: string | null,
  delimiter: string,
): string[] {
  if (projectsParam === "") return [];
  if (projectsParam === null)
    return (
      getLocalStorageValue(
        LocalStorageKey.SELECTED_PROJECTS,
        ProjectsSearchFormSchema.shape.projects,
      ) ?? []
    );

  const decodedProjectsParam = projectsParam
    .split(delimiter)
    .map(decodeProjectName);

  if (decodedProjectsParam.length > SELECTED_PROJECTS_LIMIT)
    return decodedProjectsParam.slice(0, SELECTED_PROJECTS_LIMIT);
  if (decodedProjectsParam.length > 0) return decodedProjectsParam;
  return [];
}

export function getInitialTimePeriod(
  timePeriodParam: string | null,
): TimePeriod {
  const validTimePeriods: TimePeriod[] = [
    "months-1",
    "months-3",
    "months-6",
    "years-1",
    "years-2",
    "years-5",
    "all-time",
  ];

  if (
    timePeriodParam &&
    validTimePeriods.includes(timePeriodParam as TimePeriod)
  ) {
    return timePeriodParam as TimePeriod;
  }

  return "all-time";
}

export function getInitialChartScale(
  chartScaleParam: string | null,
): ChartScale {
  const validChartScales: ChartScale[] = ["linear", "logarithmic"];

  if (
    chartScaleParam &&
    validChartScales.includes(chartScaleParam as ChartScale)
  ) {
    return chartScaleParam as ChartScale;
  }

  return "linear";
}

export function useInitialProjectsFromSearchParams(delimiter: string) {
  const searchParams = useSearchParams();
  const projectsParam = searchParams.get("projects");
  return getInitialProjects(projectsParam, delimiter);
}

export function useInitialTimePeriodFromSearchParams() {
  const searchParams = useSearchParams();
  const timePeriodParam = searchParams.get("period");
  return getInitialTimePeriod(timePeriodParam);
}

export function useInitialChartScaleFromSearchParams() {
  const searchParams = useSearchParams();
  const chartScaleParam = searchParams.get("scale");
  return getInitialChartScale(chartScaleParam);
}

export function getOtherParamsString(
  searchParams: URLSearchParams,
  excludeKeys: string[],
): string {
  return Array.from(searchParams.entries())
    .filter(([key]) => !excludeKeys.includes(key))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");
}

export function getProjectsQueryString(
  projects: string[],
  delimiter: string,
): string {
  return `projects=${projects.map(encodeProjectName).join(delimiter)}`;
}

export function constructNewUrl(
  pathname: string,
  selectedProjects: string[],
  timePeriod: TimePeriod,
  chartScale: ChartScale,
  otherParams: string,
  delimiter: string,
): string {
  const queryParts: string[] = [];

  if (selectedProjects.length > 0) {
    queryParts.push(getProjectsQueryString(selectedProjects, delimiter));
  }

  if (timePeriod !== "all-time") {
    queryParts.push(`period=${timePeriod}`);
  }

  if (chartScale !== "linear") {
    queryParts.push(`scale=${chartScale}`);
  }

  if (otherParams) {
    queryParts.push(otherParams);
  }

  return queryParts.length > 0
    ? `${pathname}?${queryParts.join("&")}`
    : pathname;
}

export function useUpdateSearchParams(
  selectedProjects: string[],
  timePeriod: TimePeriod,
  chartScale: ChartScale,
  delimiter: string,
) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const otherParams = getOtherParamsString(searchParams, [
      "projects",
      "period",
      "scale",
    ]);
    const newUrl = constructNewUrl(
      pathname,
      selectedProjects,
      timePeriod,
      chartScale,
      otherParams,
      delimiter,
    );
    router.replace(newUrl, { scroll: false });
  }, [
    selectedProjects,
    timePeriod,
    chartScale,
    router,
    searchParams,
    delimiter,
    pathname,
  ]);
}

export function useUpdateSearchParamsProjects(
  selectedProjects: string[],
  delimiter: string,
) {
  const initialTimePeriod = useInitialTimePeriodFromSearchParams();
  const initialChartScale = useInitialChartScaleFromSearchParams();

  useUpdateSearchParams(
    selectedProjects,
    initialTimePeriod,
    initialChartScale,
    delimiter,
  );
}
