import fetchNpmDownloadsAdaptive, {
  hasTransientErrors,
  parsePackageList,
} from "@/api/fetchNpmDownloadsAdaptive";
import { SELECTED_PROJECTS_LIMIT } from "@/lib/config/constants";
import { isAppError } from "@/lib/utils/AppError";
import getClientIp from "@/lib/utils/getClientIp";
import { checkRateLimit } from "@/lib/utils/rateLimit";
import isValidPackageName from "@/lib/utils/isValidPackageName";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const RATE_LIMIT = { windowMs: 60 * 1000, maxRequests: 20 } as const;

const CACHE_CONTROL = {
  success: "public, s-maxage=3600, stale-while-revalidate=86400",
  error: "no-store",
} as const;

const jsonResponse = <T>(
  body: T,
  status: number,
  cacheControl: string = CACHE_CONTROL.error,
) =>
  NextResponse.json(body, {
    status,
    headers: { "Cache-Control": cacheControl },
  });

const errorResponse = (error: string, status: number) =>
  jsonResponse({ error }, status);

export async function GET(request: NextRequest) {
  const clientIP = getClientIp(request.headers);
  if (await checkRateLimit(`downloads:${clientIP}`, RATE_LIMIT)) {
    return errorResponse("Rate limit exceeded. Too many requests.", 429);
  }

  const { searchParams } = new URL(request.url);
  const packages = parsePackageList(searchParams.get("packages"));

  if (packages.length === 0) {
    return errorResponse("No packages provided.", 400);
  }

  if (packages.length > SELECTED_PROJECTS_LIMIT) {
    return errorResponse(
      `A maximum of ${SELECTED_PROJECTS_LIMIT} packages is allowed.`,
      400,
    );
  }

  const invalidPackages = packages.filter((name) => !isValidPackageName(name));
  if (invalidPackages.length > 0) {
    return errorResponse(
      `Invalid package names: ${invalidPackages.join(", ")}`,
      400,
    );
  }

  try {
    const { data, errors, stats } = await fetchNpmDownloadsAdaptive(packages);
    const cacheControl = hasTransientErrors(errors)
      ? CACHE_CONTROL.error
      : CACHE_CONTROL.success;
    return jsonResponse({ data, errors, stats }, 200, cacheControl);
  } catch (error) {
    console.error("Error in GET /api/downloads:", error);
    const message = isAppError(error)
      ? error.message
      : "Failed to fetch NPM download data";
    return errorResponse(message, 500);
  }
}
