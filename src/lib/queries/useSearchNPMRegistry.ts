import searchNPMRegistry from "@/api/searchNpmRegistry";
import { useQuery } from "@tanstack/react-query";
import { getSearchNPMRegistryQueryKey } from "./keys";

export default function useSearchNPMRegistry(search: string) {
  return useQuery({
    queryKey: getSearchNPMRegistryQueryKey(search),
    queryFn: () => searchNPMRegistry(search),
    enabled: !!search && search.length >= 2,
    staleTime: 5 * 60 * 1000,
  });
}
