import {
  NPMPackageSearch,
  NPMPackageSearchSchema,
} from "../schemas/npmPackageSearch";

export default async function searchNPMRegistry(
  search: string,
): Promise<NPMPackageSearch["objects"]> {
  if (!search) return [];
  try {
    const res = await fetch(
      `https://registry.npmjs.org/-/v1/search?text=${search}&size=10`,
    );
    const data = await res.json();
    try {
      const { objects } = NPMPackageSearchSchema.parse(data);
      return objects;
    } catch (error) {
      console.error(error);
      return [];
    }
  } catch (error) {
    console.error(error);
    return [];
  }
}
