import { useQuery } from "@tanstack/react-query";
import { PopularComparisonResponseSchema } from "../types/global-comparison";
import safeParse from "../utils/safeParse";

export default function usePopularComparisons() {
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
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 10 * 60 * 1000, // 10 minutes
  });
}
