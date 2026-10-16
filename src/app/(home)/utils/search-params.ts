import {
  MULTI_SEARCH_DELIMITER,
  SELECTED_PROJECTS_LIMIT,
} from "@/lib/config/constants";
import { ChartMode } from "@/lib/enums/ChartMode";
import { ChartScale } from "@/lib/enums/ChartScale";
import { TimePeriod } from "@/lib/enums/TimePeriod";
import {
  COMPARE_PATH_PREFIX,
  decodeProjectName,
  encodeProjectName,
  projectsToComparePath,
  slugToProjects,
} from "@/lib/utils/slug";
import { useSearchParams } from "next/navigation";
import { useEffect } from "react";

export {
  decodeProjectName,
  encodeProjectName,
  projectsToSlug,
  slugToProjects,
} from "@/lib/utils/slug";

const MANAGED_PARAM_KEYS = ["projects", "period", "scale", "mode"] as const;
const EMPTY_SELECTION_URL = "/?projects=";

export function getInitialProjects(
  projectsParam: string | null,
  delimiter: string,
): string[] {
  if (!projectsParam) return [];

  return projectsParam
    .split(delimiter)
    .map(decodeProjectName)
    .slice(0, SELECTED_PROJECTS_LIMIT);
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

export function getInitialChartMode(chartModeParam: string | null): ChartMode {
  const validChartModes: ChartMode[] = ["absolute", "normalized"];

  if (chartModeParam && validChartModes.includes(chartModeParam as ChartMode)) {
    return chartModeParam as ChartMode;
  }

  return "absolute";
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

export function useInitialChartModeFromSearchParams() {
  const searchParams = useSearchParams();
  const chartModeParam = searchParams.get("mode");
  return getInitialChartMode(chartModeParam);
}

export function getOtherParamsString(
  searchParams: URLSearchParams,
  excludeKeys: readonly string[],
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
  chartMode: ChartMode = "absolute",
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

  if (chartMode !== "absolute") {
    queryParts.push(`mode=${chartMode}`);
  }

  if (otherParams) {
    queryParts.push(otherParams);
  }

  return queryParts.length > 0
    ? `${pathname}?${queryParts.join("&")}`
    : pathname;
}

export function getCurrentProjects(
  searchParams: URLSearchParams,
  delimiter: string,
): string[] {
  const projectsParam = searchParams.get("projects");
  if (!projectsParam) return [];
  return projectsParam.split(delimiter).map(decodeProjectName);
}

function getComparableCurrentUrl(
  pathname: string,
  searchParams: URLSearchParams,
  delimiter: string,
): string {
  const otherParams = getOtherParamsString(searchParams, MANAGED_PARAM_KEYS);
  return constructNewUrl(
    pathname,
    getCurrentProjects(searchParams, delimiter),
    getInitialTimePeriod(searchParams.get("period")),
    getInitialChartScale(searchParams.get("scale")),
    otherParams,
    delimiter,
    getInitialChartMode(searchParams.get("mode")),
  );
}

function stripQueryPrefix(url: string): string {
  return url.replace(/^\?/, "");
}

function joinPathAndQuery(path: string, query: string): string {
  return query ? `${path}?${query}` : path;
}

function getPreservedQuery(
  searchParams: URLSearchParams,
  delimiter: string,
): string {
  return stripQueryPrefix(
    constructNewUrl(
      "",
      [],
      getInitialTimePeriod(searchParams.get("period")),
      getInitialChartScale(searchParams.get("scale")),
      getOtherParamsString(searchParams, MANAGED_PARAM_KEYS),
      delimiter,
      getInitialChartMode(searchParams.get("mode")),
    ),
  );
}

export function isComparePathname(pathname: string): boolean {
  return pathname.startsWith(COMPARE_PATH_PREFIX);
}

export function constructCompareUrl(
  selectedProjects: string[],
  searchParams: URLSearchParams,
  delimiter: string,
): string {
  const query = getPreservedQuery(searchParams, delimiter);

  if (selectedProjects.length === 0)
    return [EMPTY_SELECTION_URL, query].filter(Boolean).join("&");

  return joinPathAndQuery(projectsToComparePath(selectedProjects), query);
}

function getComparableCurrentCompareUrl(
  pathname: string,
  searchParams: URLSearchParams,
  delimiter: string,
): string {
  const currentProjects = slugToProjects(
    pathname.slice(COMPARE_PATH_PREFIX.length),
  );
  const query = stripQueryPrefix(
    getComparableCurrentUrl("", searchParams, delimiter),
  );
  return joinPathAndQuery(projectsToComparePath(currentProjects), query);
}

function getProjectsUrlCandidates(
  pathname: string,
  searchParams: URLSearchParams,
  selectedProjects: string[],
  delimiter: string,
) {
  if (isComparePathname(pathname)) {
    return {
      current: getComparableCurrentCompareUrl(
        pathname,
        searchParams,
        delimiter,
      ),
      target: constructCompareUrl(selectedProjects, searchParams, delimiter),
    };
  }

  return {
    current: getComparableCurrentUrl(pathname, searchParams, delimiter),
    target: constructNewUrl(
      pathname,
      selectedProjects,
      getInitialTimePeriod(searchParams.get("period")),
      getInitialChartScale(searchParams.get("scale")),
      getOtherParamsString(searchParams, MANAGED_PARAM_KEYS),
      delimiter,
      getInitialChartMode(searchParams.get("mode")),
    ),
  };
}

export function getProjectsUrlUpdate(
  pathname: string,
  searchParams: URLSearchParams,
  selectedProjects: string[],
  delimiter: string,
): string | null {
  const { current, target } = getProjectsUrlCandidates(
    pathname,
    searchParams,
    selectedProjects,
    delimiter,
  );
  return current === target ? null : target;
}

function readCurrentLocation() {
  return {
    pathname: window.location.pathname,
    searchParams: new URLSearchParams(window.location.search),
  };
}

function replaceUrl(url: string) {
  window.history.replaceState(null, "", url);
}

export function useUpdateSearchParamsProjects(
  selectedProjects: string[],
  delimiter: string,
) {
  useEffect(() => {
    const { pathname, searchParams } = readCurrentLocation();
    const newUrl = getProjectsUrlUpdate(
      pathname,
      searchParams,
      selectedProjects,
      delimiter,
    );

    if (newUrl) replaceUrl(newUrl);
  }, [selectedProjects, delimiter]);
}

export function useUpdateSearchParams(
  selectedProjects: string[],
  timePeriod: TimePeriod,
  chartScale: ChartScale,
  delimiter: string,
  chartMode: ChartMode = "absolute",
) {
  useEffect(() => {
    const { pathname, searchParams } = readCurrentLocation();
    const otherParams = getOtherParamsString(searchParams, MANAGED_PARAM_KEYS);
    replaceUrl(
      constructNewUrl(
        pathname,
        selectedProjects,
        timePeriod,
        chartScale,
        otherParams,
        delimiter,
        chartMode,
      ),
    );
  }, [selectedProjects, timePeriod, chartScale, delimiter, chartMode]);
}

export function useUpdateSearchParamsChart(
  timePeriod: TimePeriod,
  chartScale: ChartScale,
  chartMode: ChartMode = "absolute",
) {
  useEffect(() => {
    const { pathname, searchParams } = readCurrentLocation();
    const otherParams = getOtherParamsString(searchParams, MANAGED_PARAM_KEYS);
    const newUrl = constructNewUrl(
      pathname,
      getCurrentProjects(searchParams, MULTI_SEARCH_DELIMITER),
      timePeriod,
      chartScale,
      otherParams,
      MULTI_SEARCH_DELIMITER,
      chartMode,
    );

    if (
      getComparableCurrentUrl(
        pathname,
        searchParams,
        MULTI_SEARCH_DELIMITER,
      ) === newUrl
    )
      return;

    replaceUrl(newUrl);
  }, [timePeriod, chartScale, chartMode]);
}
