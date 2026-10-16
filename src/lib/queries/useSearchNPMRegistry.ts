import searchNPMRegistry from "@/api/searchNpmRegistry";
import { useQuery } from "@tanstack/react-query";
import { getSearchNPMRegistryQueryKey, normalizeSearchTerm } from "./keys";

const MIN_SEARCH_LENGTH = 2;

export default function useSearchNPMRegistry(search: string) {
  const term = normalizeSearchTerm(search);
  const enabled = term.length >= MIN_SEARCH_LENGTH;
  return useQuery({
    queryKey: getSearchNPMRegistryQueryKey(term),
    queryFn: ({ signal }) => searchNPMRegistry(term, signal),
    enabled,
    placeholderData: (previousData) => (enabled ? previousData : undefined),
    staleTime: 5 * 60 * 1000,
  });
}
