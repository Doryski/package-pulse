import { useQuery } from "@tanstack/react-query";
import { GlobalComparisonResponseSchema } from "../types/global-comparison";
import safeParse from "../utils/safeParse";

type UseLatestComparisonsOptions = {
  enabled?: boolean;
};

export default function useLatestComparisons({
  enabled = true,
}: UseLatestComparisonsOptions = {}) {
  return useQuery({
    queryKey: ["latest-comparisons"],
    queryFn: async () => {
      const response = await fetch("/api/comparisons?limit=6");
      if (!response.ok) {
        throw new Error("Failed to fetch comparisons");
      }
      const result = await response.json();
      return safeParse(result, GlobalComparisonResponseSchema);
    },
    enabled,
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });
}
