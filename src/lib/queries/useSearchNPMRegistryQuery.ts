import searchNPMRegistry from "@/api/searchNpmRegistry";
import { useQuery } from "@tanstack/react-query";
import { getSearchNPMRegistryQueryKey } from "./keys";

export default function useSearchNPMRegistryQuery(search: string) {
  return useQuery({
    queryKey: getSearchNPMRegistryQueryKey(search),
    queryFn: () => searchNPMRegistry(search),
    enabled: !!search,
    staleTime: 5 * 60 * 1000,
  });
}
