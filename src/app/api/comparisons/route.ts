import { encodeRegistryPackageName } from "@/api/fetchPackageInfo";
import { SELECTED_PROJECTS_LIMIT } from "@/lib/config/constants";
import {
  comparisonsStorage,
  getUniqueComparisons,
} from "@/lib/storage/comparisons-storage";
import {
  CreateGlobalComparisonRequestSchema,
  GlobalComparison,
  GlobalComparisonError,
  GlobalComparisonResponse,
  PublicComparison,
} from "@/lib/types/global-comparison";
import getClientIp from "@/lib/utils/getClientIp";
import { checkRateLimit } from "@/lib/utils/rateLimit";
import isValidPackageName from "@/lib/utils/isValidPackageName";
import {
  COMPARISONS_READ_RATE_LIMIT,
  ComparisonsLimitSchema,
} from "@/lib/schemas/comparisonsQuery.schema";
import { NextRequest, NextResponse } from "next/server";

type CreateComparisonResponse = PublicComparison & {
  validation?: {
    invalidPackages: string[];
    message: string;
  };
};

function toPublicComparison(comparison: GlobalComparison): PublicComparison {
  const { clientIP: _clientIP, userAgent: _userAgent, ...rest } = comparison;
  return rest;
}

const RATE_LIMIT = { windowMs: 60 * 1000, maxRequests: 10 } as const;

const VALIDATION_CACHE = {
  ttlMs: 5 * 60 * 1000,
  maxEntries: 1000,
} as const;
const REGISTRY_TIMEOUT_MS = 5000;
const ABBREVIATED_PACKUMENT = "application/vnd.npm.install-v1+json";

const packageValidationCache = new Map<
  string,
  { isValid: boolean; timestamp: number }
>();

const isFresh = (timestamp: number, now: number) =>
  now - timestamp < VALIDATION_CACHE.ttlMs;

function readCachedValidation(packageName: string): boolean | undefined {
  const cached = packageValidationCache.get(packageName);
  if (!cached || !isFresh(cached.timestamp, Date.now())) return undefined;
  return cached.isValid;
}

function evictValidationCache(now: number): void {
  for (const [name, entry] of packageValidationCache) {
    if (!isFresh(entry.timestamp, now)) packageValidationCache.delete(name);
  }
  const overflow = packageValidationCache.size - VALIDATION_CACHE.maxEntries;
  [...packageValidationCache.keys()]
    .slice(0, Math.max(0, overflow))
    .forEach((name) => packageValidationCache.delete(name));
}

function cacheValidation(packageName: string, isValid: boolean): void {
  const now = Date.now();
  packageValidationCache.delete(packageName);
  packageValidationCache.set(packageName, { isValid, timestamp: now });
  if (packageValidationCache.size <= VALIDATION_CACHE.maxEntries) return;
  evictValidationCache(now);
}

async function fetchPackageExists(packageName: string): Promise<boolean> {
  const response = await fetch(
    `https://registry.npmjs.org/${encodeRegistryPackageName(packageName)}`,
    {
      method: "HEAD",
      headers: { Accept: ABBREVIATED_PACKUMENT },
      signal: AbortSignal.timeout(REGISTRY_TIMEOUT_MS),
    },
  );
  return response.status === 200;
}

async function validatePackageExists(packageName: string): Promise<boolean> {
  const cached = readCachedValidation(packageName);
  if (cached !== undefined) return cached;

  try {
    const isValid = await fetchPackageExists(packageName);
    cacheValidation(packageName, isValid);
    return isValid;
  } catch (_error) {
    return false;
  }
}

const hostOf = (value: string | null): string | null => {
  if (!value) return null;
  try {
    return new URL(value).host;
  } catch (_error) {
    return null;
  }
};

const getRequestHost = (request: NextRequest) =>
  request.headers.get("x-forwarded-host")?.split(",")[0]?.trim() ||
  request.headers.get("host") ||
  request.nextUrl.host;

function isSameOriginRequest(request: NextRequest): boolean {
  const requestHost = getRequestHost(request);
  const origin = request.headers.get("origin");
  const sourceHost = origin
    ? hostOf(origin)
    : hostOf(request.headers.get("referer"));
  return sourceHost !== null && sourceHost === requestHost;
}

const errorResponse = (error: string, status: number) =>
  NextResponse.json<GlobalComparisonError>({ error }, { status });

const rateLimitedResponse = () =>
  errorResponse("Rate limit exceeded. Too many requests.", 429);

async function validateAndFilterPackages(packages: string[]): Promise<{
  validPackages: string[];
  invalidPackages: string[];
}> {
  const validPackages: string[] = [];
  const invalidPackages: string[] = [];

  for (const packageName of packages) {
    const trimmedName = packageName.trim();

    if (!trimmedName) continue;

    if (!isValidPackageName(trimmedName)) {
      invalidPackages.push(trimmedName);
      continue;
    }

    const exists = await validatePackageExists(trimmedName);
    if (exists) {
      validPackages.push(trimmedName);
    } else {
      invalidPackages.push(trimmedName);
    }
  }

  return { validPackages, invalidPackages };
}

function generateComparisonId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export async function GET(
  request: NextRequest,
): Promise<NextResponse<GlobalComparisonResponse | GlobalComparisonError>> {
  const clientIP = getClientIp(request.headers);
  if (
    await checkRateLimit(
      `comparisons-read:${clientIP}`,
      COMPARISONS_READ_RATE_LIMIT,
    )
  ) {
    return rateLimitedResponse();
  }

  try {
    const { searchParams } = new URL(request.url);
    const limit = ComparisonsLimitSchema.parse(searchParams.get("limit"));

    const comparisons = await comparisonsStorage.getComparisons();
    const uniqueComparisons = getUniqueComparisons(comparisons, limit);

    return NextResponse.json({
      comparisons: uniqueComparisons.map(toPublicComparison),
      total: comparisons.length,
    });
  } catch (error) {
    console.error("Error in GET /api/comparisons:", error);
    return errorResponse("Failed to read comparisons", 500);
  }
}

export async function POST(
  request: NextRequest,
): Promise<NextResponse<CreateComparisonResponse | GlobalComparisonError>> {
  if (!isSameOriginRequest(request)) {
    return errorResponse("Cross-origin requests are not allowed.", 403);
  }

  try {
    const clientIP = getClientIp(request.headers);

    if (await checkRateLimit(`comparisons:${clientIP}`, RATE_LIMIT)) {
      return rateLimitedResponse();
    }

    const rawBody = await request.json().catch(() => null);
    const parsedBody = CreateGlobalComparisonRequestSchema.safeParse(rawBody);

    if (!parsedBody.success) {
      return NextResponse.json(
        {
          error: `Invalid request body. Projects array required (1-${SELECTED_PROJECTS_LIMIT} package names).`,
        },
        { status: 400 },
      );
    }

    const { validPackages, invalidPackages } = await validateAndFilterPackages(
      parsedBody.data.projects,
    );

    if (validPackages.length === 0) {
      return NextResponse.json(
        {
          error: `No valid packages found. Invalid packages: ${invalidPackages.join(", ")}`,
        },
        { status: 400 },
      );
    }

    const newComparison: GlobalComparison = {
      id: generateComparisonId(),
      timestamp: Date.now(),
      projects: validPackages,
      clientIP: clientIP,
      userAgent: request.headers.get("user-agent") || undefined,
    };

    try {
      await comparisonsStorage.addComparison(newComparison);
    } catch (error) {
      if (error instanceof Error && error.message === "DUPLICATE_COMPARISON") {
        return NextResponse.json(
          { error: "Duplicate comparison detected." },
          { status: 409 },
        );
      }
      throw error;
    }

    const publicComparison = toPublicComparison(newComparison);
    const response: CreateComparisonResponse =
      invalidPackages.length > 0
        ? {
            ...publicComparison,
            validation: {
              invalidPackages,
              message: `${validPackages.length} valid packages stored. ${invalidPackages.length} packages filtered out.`,
            },
          }
        : publicComparison;

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error("Error in POST /api/comparisons:", error);
    return errorResponse("Failed to create comparison", 500);
  }
}
