import { SELECTED_PROJECTS_LIMIT } from "@/lib/config/constants";
import isValidPackageName from "@/lib/utils/isValidPackageName";

const SLUG_SEPARATOR = "-vs-";
export const COMPARE_PATH_PREFIX = "/compare/";
const MAX_DECODE_PASSES = 3;

export const encodeProjectName = (name: string) =>
  encodeURIComponent(name)
    .replace(/%2C/g, ",")
    .replace(/%40/g, "@")
    .replace(/%2F/g, "/");

export function decodeProjectName(name: string): string {
  try {
    return decodeURIComponent(name);
  } catch {
    return name;
  }
}

function decodeSlugSegment(
  segment: string,
  passesLeft: number = MAX_DECODE_PASSES,
): string {
  const decoded = decodeProjectName(segment);
  if (decoded === segment || passesLeft <= 1) return decoded;
  return decodeSlugSegment(decoded, passesLeft - 1);
}

export function projectsToSlug(projects: string[]): string {
  return projects
    .map((project) => encodeProjectName(project).replace(/-/g, "%2D"))
    .join(SLUG_SEPARATOR);
}

export function projectsToComparePath(projects: string[]): string {
  return `${COMPARE_PATH_PREFIX}${projectsToSlug(projects)}`;
}

export function slugToProjects(slug: string): string[] {
  if (!slug) return [];

  const projects = slug
    .split(SLUG_SEPARATOR)
    .map((segment) => decodeSlugSegment(segment));

  if (!projects.every(isValidPackageName)) return [];

  return projects.slice(0, SELECTED_PROJECTS_LIMIT);
}

export function slugifyTitle(title: string): string {
  return title.toLowerCase().replace(/&/g, "").trim().replace(/\s+/g, "-");
}
