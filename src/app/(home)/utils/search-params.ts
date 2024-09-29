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
) {
  const decodedProjectsParam = projectsParam
    ? projectsParam.split(delimiter).map(decodeProjectName)
    : null;

  if (decodedProjectsParam && decodedProjectsParam.length > 0) {
    return decodedProjectsParam;
  }

  return (
    getLocalStorageValue(
      LocalStorageKey.SELECTED_PROJECTS,
      ProjectsSearchFormSchema.shape.projects,
    ) ?? []
  );
}

export function useInitialProjectsFromSearchParams(delimiter: string) {
  const searchParams = useSearchParams();
  const projectsParam = searchParams.get("projects");
  return getInitialProjects(projectsParam, delimiter);
}

export function getOtherParamsString(
  searchParams: URLSearchParams,
  excludeKey: string,
): string {
  return Array.from(searchParams.entries())
    .filter(([key]) => key !== excludeKey)
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
  otherParams: string,
  delimiter: string,
): string {
  if (selectedProjects.length > 0) {
    const projectsQuery = getProjectsQueryString(selectedProjects, delimiter);
    return otherParams
      ? `${pathname}?${projectsQuery}&${otherParams}`
      : `${pathname}?${projectsQuery}`;
  } else if (otherParams) {
    return `${pathname}?${otherParams}`;
  }
  return pathname;
}

export function useUpdateSearchParams(
  selectedProjects: string[],
  delimiter: string,
) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const otherParams = getOtherParamsString(searchParams, "projects");
    const newUrl = constructNewUrl(
      pathname,
      selectedProjects,
      otherParams,
      delimiter,
    );
    router.replace(newUrl, { scroll: false });
  }, [selectedProjects, router, searchParams, delimiter, pathname]);
}
