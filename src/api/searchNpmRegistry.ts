import safeParse from "@/lib/utils/safeParse";
import {
  NPMPackageSearch,
  NPMPackageSearchSchema,
} from "../lib/schemas/npmPackageSearch.schema";

export default async function searchNPMRegistry(
  search: string,
): Promise<NPMPackageSearch["objects"]> {
  if (!search) return [];
  try {
    const res = await fetch(
      `https://registry.npmjs.org/-/v1/search?text=${encodeURIComponent(search)}&size=20&popularity=1.0`,
    );
    const data = await res.json();
    const parsedData = safeParse(data, NPMPackageSearchSchema);
    return parsedData.objects;
  } catch (error) {
    console.error(error);
    return [];
  }
}
