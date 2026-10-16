import { env } from "@/lib/config/env";
import { errorResponse, jsonResponse } from "@/lib/server/packageListRequest";
import {
  findSimilarProjects,
  parseSimilarProjectsInput,
} from "@/lib/server/similarProjects";
import { getCached, setCached } from "@/lib/storage/kvCache";
import getClientIp from "@/lib/utils/getClientIp";
import { checkRateLimit } from "@/lib/utils/rateLimit";
import { NextRequest } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";
export const maxDuration = 30;

const CACHE_TTL_SECONDS = 7 * 24 * 60 * 60;

const SUCCESS_CACHE_CONTROL =
  "public, s-maxage=86400, stale-while-revalidate=86400";

const RATE_LIMITS = {
  client: { windowMs: 60 * 1000, maxRequests: 10 },
  global: { windowMs: 24 * 60 * 60 * 1000, maxRequests: 500 },
} as const;

const GLOBAL_RATE_LIMIT_KEY = "similar-projects:global";

const CachedSimilarProjectsSchema = z.array(z.string());

const toCacheKey = (names: string[]) => `similar:${names.join(",")}`;

const isCacheEnabled = () => !env.PP_E2E_TEST_PROXY;

const readCache = async (key: string) => {
  if (!isCacheEnabled()) return null;
  return getCached(key, CachedSimilarProjectsSchema);
};

const writeCache = async (key: string, similarProjects: string[]) => {
  if (!isCacheEnabled()) return;
  await setCached(key, similarProjects, CACHE_TTL_SECONDS);
};

const isClientRateLimited = (request: NextRequest) =>
  checkRateLimit(
    `similar-projects:${getClientIp(request.headers)}`,
    RATE_LIMITS.client,
  );

const isGlobalRateLimited = async () => {
  if (env.PP_E2E_TEST_PROXY) return false;
  return checkRateLimit(GLOBAL_RATE_LIMIT_KEY, RATE_LIMITS.global);
};

const isAnyRateLimited = async (request: NextRequest) => {
  const results = await Promise.all([
    isClientRateLimited(request),
    isGlobalRateLimited(),
  ]);
  return results.some(Boolean);
};

const isCacheable = (request: NextRequest, similarProjects: string[]) =>
  similarProjects.length > 0 && !request.signal.aborted;

const successResponse = (similarProjects: string[]) =>
  jsonResponse({ similarProjects }, 200, SUCCESS_CACHE_CONTROL);

export async function GET(request: NextRequest) {
  const names = parseSimilarProjectsInput(
    request.nextUrl.searchParams.get("packages"),
  );
  if (!names) return errorResponse("Invalid packages.", 400);

  const cacheKey = toCacheKey(names);
  const cached = await readCache(cacheKey);
  if (cached) return successResponse(cached);

  if (await isAnyRateLimited(request)) {
    return jsonResponse({ similarProjects: [] }, 200);
  }

  try {
    const similarProjects = await findSimilarProjects(names, request.signal);
    if (isCacheable(request, similarProjects)) {
      await writeCache(cacheKey, similarProjects);
    }
    return successResponse(similarProjects);
  } catch {
    return errorResponse("Failed to fetch similar projects.", 502);
  }
}
