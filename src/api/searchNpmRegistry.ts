import AppError from "@/lib/utils/AppError";
import safeParse from "@/lib/utils/safeParse";
import {
  NPMPackageSearch,
  NPMPackageSearchSchema,
} from "../lib/schemas/npmPackageSearch.schema";

export const SEARCH_NPM_REGISTRY_ERROR_MESSAGE =
  "Failed to search the npm registry";

const buildSearchUrl = (search: string) =>
  `https://registry.npmjs.org/-/v1/search?text=${encodeURIComponent(search)}&size=20&popularity=1.0`;

export default async function searchNPMRegistry(
  search: string,
  signal?: AbortSignal,
): Promise<NPMPackageSearch["objects"]> {
  if (!search) return [];
  const res = await fetch(buildSearchUrl(search), { signal });
  if (!res.ok) {
    throw new AppError(SEARCH_NPM_REGISTRY_ERROR_MESSAGE, {
      status: res.status,
    });
  }
  return safeParse(await res.json(), NPMPackageSearchSchema).objects;
}
