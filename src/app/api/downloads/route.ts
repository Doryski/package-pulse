import fetchNpmDownloadsAdaptive, {
  AdaptiveDownloadsResult,
  createUpstreamSignal,
  hasTransientErrors,
  parsePackageList,
} from "@/api/fetchNpmDownloadsAdaptive";
import { SELECTED_PROJECTS_LIMIT } from "@/lib/config/constants";
import getFirstPublished from "@/lib/server/firstPublished";
import { isAppError } from "@/lib/utils/AppError";
import { toCompactSeries } from "@/lib/utils/compactSeries";
import getClientIp from "@/lib/utils/getClientIp";
import { checkRateLimit } from "@/lib/utils/rateLimit";
import isValidPackageName from "@/lib/utils/isValidPackageName";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 30;

const RATE_LIMIT = { windowMs: 60 * 1000, maxRequests: 20 } as const;

const CACHE_CONTROL = {
  success: "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400",
  error: "no-store",
} as const;

const API_VERSION = { compact: "2" } as const;

type ApiVersion = "legacy" | "compact";

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

const parseApiVersion = (raw: string | null): ApiVersion | null => {
  if (raw === null) return "legacy";
  if (raw === API_VERSION.compact) return "compact";
  return null;
};

const toLegacyBody = ({ data, errors, stats }: AdaptiveDownloadsResult) => ({
  data,
  errors,
  stats,
});

const toCompactBody = ({ data, errors }: AdaptiveDownloadsResult) => ({
  data: Object.fromEntries(
    Object.entries(data).map(([name, series]) => [
      name,
      series ? toCompactSeries(series) : null,
    ]),
  ),
  errors,
});

const BODY_BUILDERS = {
  legacy: toLegacyBody,
  compact: toCompactBody,
} as const satisfies Record<ApiVersion, unknown>;

export async function GET(request: NextRequest) {
  const clientIP = getClientIp(request.headers);
  if (await checkRateLimit(`downloads:${clientIP}`, RATE_LIMIT)) {
    return errorResponse("Rate limit exceeded. Too many requests.", 429);
  }

  const { searchParams } = new URL(request.url);
  const version = parseApiVersion(searchParams.get("v"));

  if (version === null) {
    return errorResponse("Unsupported API version.", 400);
  }

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

  const signal = createUpstreamSignal(request.signal);

  try {
    const result = await fetchNpmDownloadsAdaptive(packages, {
      signal,
      firstPublished: await getFirstPublished(packages, signal),
    });
    const cacheControl = hasTransientErrors(result.errors)
      ? CACHE_CONTROL.error
      : CACHE_CONTROL.success;
    return jsonResponse(BODY_BUILDERS[version](result), 200, cacheControl);
  } catch (error) {
    if (signal.aborted) {
      return errorResponse("Timed out fetching NPM download data", 504);
    }
    console.error("Error in GET /api/downloads:", error);
    const message = isAppError(error)
      ? error.message
      : "Failed to fetch NPM download data";
    return errorResponse(message, 500);
  }
}
