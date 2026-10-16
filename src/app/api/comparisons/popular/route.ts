import { comparisonsStorage } from "@/lib/storage/comparisons-storage";
import {
  GlobalComparisonError,
  PopularComparisonResponse,
} from "@/lib/types/global-comparison";
import { getPopularComparisons } from "./popularComparisons";
import getClientIp from "@/lib/utils/getClientIp";
import { checkRateLimit } from "@/lib/utils/rateLimit";
import {
  COMPARISONS_READ_RATE_LIMIT,
  ComparisonsLimitSchema,
} from "@/lib/schemas/comparisonsQuery.schema";
import { NextRequest, NextResponse } from "next/server";

const SUCCESS_CACHE_CONTROL =
  "public, s-maxage=300, stale-while-revalidate=3600";
const NO_STORE = "no-store";

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
      { status: 429, headers: { "Cache-Control": NO_STORE } },
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const limit = ComparisonsLimitSchema.parse(searchParams.get("limit"));

    const comparisons = await comparisonsStorage.getComparisons();
    const popularComparisons = getPopularComparisons(comparisons, limit);

    return NextResponse.json(
      {
        comparisons: popularComparisons,
        total: popularComparisons.length,
      },
      { headers: { "Cache-Control": SUCCESS_CACHE_CONTROL } },
    );
  } catch (error) {
    console.error("Error in GET /api/comparisons/popular:", error);
    return NextResponse.json(
      { error: "Failed to read popular comparisons" },
      { status: 500, headers: { "Cache-Control": NO_STORE } },
    );
  }
}
