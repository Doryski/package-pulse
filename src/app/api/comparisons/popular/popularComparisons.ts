import {
  GlobalComparison,
  PopularComparison,
} from "@/lib/types/global-comparison";

const TRENDING_WINDOW = 7 * 24 * 60 * 60 * 1000;
const RECENT_WINDOW = 24 * 60 * 60 * 1000;

type ProjectGroup = PopularComparison & {
  recentCount: number;
  weeklyCount: number;
};

const toProjectsKey = (projects: string[]) => projects.slice().sort().join("|");

const trendingScore = ({
  recentCount,
  weeklyCount,
  total,
}: {
  recentCount: number;
  weeklyCount: number;
  total: number;
}) => recentCount * 0.5 + weeklyCount * 0.3 + total * 0.2;

export function getPopularComparisons(
  comparisons: GlobalComparison[],
  limit: number = 20,
  now: number = Date.now(),
): PopularComparison[] {
  const totals = new Map<string, number>();
  const groups = new Map<string, ProjectGroup>();

  for (const comparison of comparisons) {
    const key = toProjectsKey(comparison.projects);
    totals.set(key, (totals.get(key) ?? 0) + 1);
    const age = now - comparison.timestamp;
    if (age >= TRENDING_WINDOW) continue;

    const group = groups.get(key) ?? {
      projects: comparison.projects,
      count: 0,
      lastUsed: 0,
      averageProjectsCount: comparison.projects.length,
      recentCount: 0,
      weeklyCount: 0,
    };
    group.count++;
    group.weeklyCount++;
    if (age < RECENT_WINDOW) group.recentCount++;
    group.lastUsed = Math.max(group.lastUsed, comparison.timestamp);
    groups.set(key, group);
  }

  return Array.from(groups, ([key, group]) => ({
    group,
    score: trendingScore({
      recentCount: group.recentCount,
      weeklyCount: group.weeklyCount,
      total: totals.get(key) ?? 0,
    }),
  }))
    .sort((a, b) => b.score - a.score || b.group.count - a.group.count)
    .slice(0, limit)
    .map(({ group }) => ({
      projects: group.projects,
      count: group.count,
      lastUsed: group.lastUsed,
      averageProjectsCount: group.averageProjectsCount,
    }));
}
