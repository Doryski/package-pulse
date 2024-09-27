import LocalStorageKey from "@/lib/enums/LocalStorageKey";
import getLocalStorageValue from "@/lib/utils/getLocalStorageValue";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { ProjectsSearchFormSchema } from "../components/projects-form/schema";

export const encodeProjectName = (name: string) =>
  encodeURIComponent(name)
    .replace(/%2C/g, ",")
    .replace(/%40/g, "@")
    .replace(/%2F/g, "/");
export const decodeProjectName = (name: string) => decodeURIComponent(name);

export function useInitialProjectsFromSearchParams(delimiter: string) {
  const searchParams = useSearchParams();
  const projectsParam = searchParams.get("projects");
  const decodedProjectsParam = projectsParam
    ? projectsParam.split(delimiter).map(decodeProjectName)
    : null;
  if (!decodedProjectsParam) {
    return [];
  }

  if (decodedProjectsParam.length > 0) {
    return decodedProjectsParam;
  }

  return (
    getLocalStorageValue(
      LocalStorageKey.SELECTED_PROJECTS,
      ProjectsSearchFormSchema.shape.projects,
    ) ?? []
  );
}

export function useUpdateSearchParams(
  selectedProjects: string[],
  delimiter: string,
) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const otherParams = Array.from(searchParams.entries())
      .filter(([key]) => key !== "projects")
      .map(([key, value]) => `${key}=${value}`)
      .join("&");

    let newUrl = pathname;

    if (selectedProjects.length > 0) {
      const projectsQuery = `projects=${selectedProjects
        .map(encodeProjectName)
        .join(delimiter)}`;
      newUrl = otherParams
        ? `?${projectsQuery}&${otherParams}`
        : `?${projectsQuery}`;
    } else if (selectedProjects.length === 0 && otherParams) {
      newUrl = `?${otherParams}`;
    }

    router.replace(newUrl, { scroll: false });
  }, [selectedProjects, router, searchParams, delimiter, pathname]);
}
