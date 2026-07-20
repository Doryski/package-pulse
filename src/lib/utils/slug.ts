import { SELECTED_PROJECTS_LIMIT } from "@/lib/config/constants";

export const encodeProjectName = (name: string) =>
  encodeURIComponent(name)
    .replace(/%2C/g, ",")
    .replace(/%40/g, "@")
    .replace(/%2F/g, "/");

export const decodeProjectName = (name: string) => decodeURIComponent(name);

const SLUG_SEPARATOR = "-vs-";

export function projectsToSlug(projects: string[]): string {
  return projects
    .map((project) => encodeProjectName(project).replace(/-/g, "%2D"))
    .join(SLUG_SEPARATOR);
}

export function slugToProjects(slug: string): string[] {
  if (!slug) return [];

  const projects = slug.split(SLUG_SEPARATOR).map(decodeProjectName);

  if (projects.length > SELECTED_PROJECTS_LIMIT)
    return projects.slice(0, SELECTED_PROJECTS_LIMIT);
  if (projects.length > 0) return projects;
  return [];
}
