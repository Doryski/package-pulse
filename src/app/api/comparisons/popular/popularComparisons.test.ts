import { describe, expect, test } from "vitest";
import { GlobalComparison } from "@/lib/types/global-comparison";
import { getPopularComparisons } from "./popularComparisons";

const DAY = 24 * 60 * 60 * 1000;
const NOW = 1_800_000_000_000;
const POOL = Array.from({ length: 40 }, (_, index) => `pkg-${index}`);

const seededRandom = (seed: number) => () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
};

const buildComparisons = (count: number): GlobalComparison[] => {
  const random = seededRandom(42);
  return Array.from({ length: count }, (_, index) => ({
    id: `${index}`,
    timestamp: NOW - Math.floor(random() * 10 * DAY),
    projects: Array.from(
      { length: 2 + Math.floor(random() * 3) },
      () => POOL[Math.floor(random() * 8)]!,
    ),
  }));
};

const referencePopular = (
  comparisons: GlobalComparison[],
  limit: number,
  now: number,
) => {
  const key = (c: GlobalComparison) => c.projects.slice().sort().join("|");
  const score = (projectsKey: string) => {
    const group = comparisons.filter((c) => key(c) === projectsKey);
    if (group.length === 0) return 0;
    const recent = group.filter((c) => now - c.timestamp < DAY).length;
    const weekly = group.filter((c) => now - c.timestamp < 7 * DAY).length;
    return recent * 0.5 + weekly * 0.3 + group.length * 0.2;
  };
  const combos = new Map<
    string,
    {
      projects: string[];
      count: number;
      lastUsed: number;
      averageProjectsCount: number;
      trendingScore: number;
    }
  >();
  for (const c of comparisons.filter((c) => now - c.timestamp < 7 * DAY)) {
    const k = key(c);
    if (!combos.has(k)) {
      combos.set(k, {
        projects: c.projects,
        count: 0,
        lastUsed: 0,
        averageProjectsCount: c.projects.length,
        trendingScore: 0,
      });
    }
    const existing = combos.get(k)!;
    existing.count++;
    existing.lastUsed = Math.max(existing.lastUsed, c.timestamp);
    existing.trendingScore = score(k);
  }
  return Array.from(combos.values())
    .sort((a, b) =>
      b.trendingScore !== a.trendingScore
        ? b.trendingScore - a.trendingScore
        : b.count - a.count,
    )
    .slice(0, limit)
    .map(({ projects, count, lastUsed, averageProjectsCount }) => ({
      projects,
      count,
      lastUsed,
      averageProjectsCount,
    }));
};

const median = (values: number[]) =>
  [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)]!;

describe("getPopularComparisons", () => {
  const comparisons = buildComparisons(500);

  test.each([5, 20, 1000])(
    "matches the reference algorithm with limit %i",
    (limit) => {
      expect(getPopularComparisons(comparisons, limit, NOW)).toEqual(
        referencePopular(comparisons, limit, NOW),
      );
    },
  );

  test("ignores comparisons older than the trending window in counts but not in score", () => {
    const old = { id: "o", timestamp: NOW - 30 * DAY, projects: ["a", "b"] };
    const fresh = { id: "f", timestamp: NOW - 1000, projects: ["b", "a"] };
    const result = getPopularComparisons([old, fresh], 20, NOW);
    expect(result).toEqual([
      {
        projects: ["b", "a"],
        count: 1,
        lastUsed: fresh.timestamp,
        averageProjectsCount: 2,
      },
    ]);
  });

  test("n=500 runs within 10 ms median", () => {
    getPopularComparisons(comparisons, 20, NOW);
    const durations = Array.from({ length: 9 }, () => {
      const start = performance.now();
      getPopularComparisons(comparisons, 20, NOW);
      return performance.now() - start;
    });
    const measured = median(durations);
    console.info(`popular n=500 median ms: ${measured.toFixed(3)}`);
    expect(measured).toBeLessThanOrEqual(10);
  });
});
