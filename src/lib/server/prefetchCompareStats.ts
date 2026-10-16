import "server-only";
import fetchNpmDownloadsAdaptive, {
  AdaptiveDownloadsResult,
} from "@/api/fetchNpmDownloadsAdaptive";
import { getProjectStatsQueryKey } from "@/lib/queries/keys";
import { buildProjectStats } from "@/lib/stats/buildProjectStats";
import { toCompactSeries } from "@/lib/utils/compactSeries";
import type { QueryClient } from "@tanstack/react-query";

export const PREFETCH_TIMEOUT_MS = 4_000;

const PRODUCTION_BUILD_PHASE = "phase-production-build";

type PrefetchEnv = Record<string, string | undefined>;

export const shouldSkipPrefetch = (env: PrefetchEnv = process.env) =>
  env.NEXT_PHASE === PRODUCTION_BUILD_PHASE || env.PP_E2E_TEST_PROXY === "1";

const fetchDownloads = (projects: string[]) =>
  fetchNpmDownloadsAdaptive(projects, {
    signal: AbortSignal.timeout(PREFETCH_TIMEOUT_MS),
  }).catch(() => null);

const toProjectStats =
  ({ data, errors }: AdaptiveDownloadsResult) =>
  (projectName: string) => {
    const series = data[projectName];
    if (!series) return null;
    try {
      return {
        ...buildProjectStats(projectName, toCompactSeries(series)),
        isPartial: Boolean(errors[projectName]),
      };
    } catch {
      return null;
    }
  };

export default async function prefetchCompareStats(
  queryClient: QueryClient,
  projects: string[],
) {
  if (projects.length === 0 || shouldSkipPrefetch()) return;

  const result = await fetchDownloads(projects);
  if (!result) return;

  const readStats = toProjectStats(result);
  projects.forEach((projectName) => {
    const stats = readStats(projectName);
    if (!stats) return;
    queryClient.setQueryData(getProjectStatsQueryKey(projectName), stats);
  });
}
