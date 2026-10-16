import { projectStatsQueryOptions } from "@/lib/queries/useProjectsStats";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef } from "react";

export const PREFETCH_INTENT_DELAY_MS = 250;

export default function usePrefetchProjectsStats() {
  const queryClient = useQueryClient();
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const cancel = useCallback(() => {
    clearTimeout(timerRef.current);
    timerRef.current = undefined;
  }, []);

  const schedule = useCallback(
    (projectNames: string[]) => {
      cancel();
      timerRef.current = setTimeout(() => {
        projectNames.forEach((projectName) => {
          void queryClient.prefetchQuery(projectStatsQueryOptions(projectName));
        });
      }, PREFETCH_INTENT_DELAY_MS);
    },
    [cancel, queryClient],
  );

  useEffect(() => cancel, [cancel]);

  return useMemo(() => ({ schedule, cancel }), [schedule, cancel]);
}
