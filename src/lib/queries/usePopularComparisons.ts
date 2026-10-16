import { useQuery } from "@tanstack/react-query";
import { PopularComparisonResponseSchema } from "../types/global-comparison";
import safeParse from "../utils/safeParse";

type UsePopularComparisonsOptions = {
  enabled?: boolean;
};

export default function usePopularComparisons({
  enabled = true,
}: UsePopularComparisonsOptions = {}) {
  return useQuery({
    queryKey: ["popular-comparisons"],
    queryFn: async () => {
      const response = await fetch(
        "/api/comparisons/popular?limit=6&sort=trending",
      );
      if (!response.ok) {
        throw new Error("Failed to fetch popular comparisons");
      }
      const result = await response.json();
      return safeParse(result, PopularComparisonResponseSchema);
    },
    enabled,
    staleTime: 5 * 60 * 1000,
    refetchInterval: 10 * 60 * 1000,
  });
}
