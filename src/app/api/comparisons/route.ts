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
import isRateLimited from "@/lib/utils/rateLimit";
import isValidPackageName from "@/lib/utils/isValidPackageName";
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

const packageValidationCache = new Map<
  string,
  { isValid: boolean; timestamp: number }
>();
const VALIDATION_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function validatePackageExists(packageName: string): Promise<boolean> {
  try {
    const cached = packageValidationCache.get(packageName);
    if (cached && Date.now() - cached.timestamp < VALIDATION_CACHE_TTL) {
      return cached.isValid;
    }

    const response = await fetch(
      `https://registry.npmjs.org/${encodeURIComponent(packageName)}`,
    );
    const isValid = response.status === 200;

    packageValidationCache.set(packageName, {
      isValid,
      timestamp: Date.now(),
    });

    return isValid;
  } catch (_error) {
    return false;
  }
}

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
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 50);

    const comparisons = await comparisonsStorage.getComparisons();
    const uniqueComparisons = getUniqueComparisons(comparisons, limit);

    return NextResponse.json({
      comparisons: uniqueComparisons.map(toPublicComparison),
      total: comparisons.length,
    });
  } catch (_error) {
    return NextResponse.json(
      { error: "Failed to read comparisons" },
      { status: 500 },
    );
  }
}

export async function POST(
  request: NextRequest,
): Promise<NextResponse<CreateComparisonResponse | GlobalComparisonError>> {
  try {
    const clientIP = getClientIp(request.headers);

    if (isRateLimited(`comparisons:${clientIP}`, RATE_LIMIT)) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Too many requests." },
        { status: 429 },
      );
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
    return NextResponse.json(
      {
        error: "Failed to create comparison",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
