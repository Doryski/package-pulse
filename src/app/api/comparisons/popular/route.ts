import { comparisonsStorage } from "@/lib/storage/comparisons-storage";
import {
  GlobalComparison,
  GlobalComparisonError,
  PopularComparison,
  PopularComparisonResponse,
} from "@/lib/types/global-comparison";
import getClientIp from "@/lib/utils/getClientIp";
import { checkRateLimit } from "@/lib/utils/rateLimit";
import {
  COMPARISONS_READ_RATE_LIMIT,
  ComparisonsLimitSchema,
} from "@/lib/schemas/comparisonsQuery.schema";
import { NextRequest, NextResponse } from "next/server";

const TRENDING_WINDOW = 7 * 24 * 60 * 60 * 1000; // 7 days
const RECENT_WINDOW = 24 * 60 * 60 * 1000; // 24 hours

type PopularComparisonWithTrending = PopularComparison & {
  trendingScore: number;
};

function calculateTrendingScore(
  comparisons: GlobalComparison[],
  projectsKey: string,
): number {
  const now = Date.now();
  const recentComparisons = comparisons.filter(
    (c) => c.projects.slice().sort().join("|") === projectsKey,
  );

  const totalComparisons = recentComparisons.length;
  if (totalComparisons === 0) return 0;

  const recentCount = recentComparisons.filter(
    (c) => now - c.timestamp < RECENT_WINDOW,
  ).length;

  const weeklyCount = recentComparisons.filter(
    (c) => now - c.timestamp < TRENDING_WINDOW,
  ).length;

  return recentCount * 0.5 + weeklyCount * 0.3 + totalComparisons * 0.2;
}

function getPopularComparisons(
  comparisons: GlobalComparison[],
  limit: number = 20,
): PopularComparison[] {
  const now = Date.now();
  const trendingComparisons = comparisons.filter(
    (c) => now - c.timestamp < TRENDING_WINDOW,
  );

  const projectCombinations = new Map<string, PopularComparisonWithTrending>();

  for (const comparison of trendingComparisons) {
    const projectsKey = comparison.projects.slice().sort().join("|");

    if (!projectCombinations.has(projectsKey)) {
      projectCombinations.set(projectsKey, {
        projects: comparison.projects,
        count: 0,
        lastUsed: 0,
        averageProjectsCount: comparison.projects.length,
        trendingScore: 0,
      });
    }

    const existing = projectCombinations.get(projectsKey)!;
    existing.count++;
    existing.lastUsed = Math.max(existing.lastUsed, comparison.timestamp);
    existing.trendingScore = calculateTrendingScore(comparisons, projectsKey);
  }

  const sortedComparisons = Array.from(projectCombinations.values()).sort(
    (a, b) => {
      if (b.trendingScore !== a.trendingScore) {
        return b.trendingScore - a.trendingScore;
      }
      return b.count - a.count;
    },
  );

  return sortedComparisons.slice(0, limit).map((comparison) => ({
    projects: comparison.projects,
    count: comparison.count,
    lastUsed: comparison.lastUsed,
    averageProjectsCount: comparison.averageProjectsCount,
  }));
}

export async function GET(
  request: NextRequest,
): Promise<NextResponse<PopularComparisonResponse | GlobalComparisonError>> {
  const clientIP = getClientIp(request.headers);
  if (
    await checkRateLimit(
      `comparisons-popular:${clientIP}`,
      COMPARISONS_READ_RATE_LIMIT,
    )
  ) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Too many requests." },
      { status: 429 },
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const limit = ComparisonsLimitSchema.parse(searchParams.get("limit"));

    const comparisons = await comparisonsStorage.getComparisons();
    const popularComparisons = getPopularComparisons(comparisons, limit);

    return NextResponse.json({
      comparisons: popularComparisons,
      total: popularComparisons.length,
    });
  } catch (error) {
    console.error("Error in GET /api/comparisons/popular:", error);
    return NextResponse.json(
      { error: "Failed to read popular comparisons" },
      { status: 500 },
    );
  }
}
