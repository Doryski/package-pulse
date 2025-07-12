import { useQuery } from "@tanstack/react-query";
import { GlobalComparisonResponseSchema } from "../types/global-comparison";
import safeParse from "../utils/safeParse";

export default function useLatestComparisons() {
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
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // 1 minute
  });
}
