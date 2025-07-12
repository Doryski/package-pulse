import {
  comparisonsStorage,
  getUniqueComparisons,
} from "@/lib/storage/comparisons-storage";
import {
  CreateGlobalComparisonRequest,
  GlobalComparison,
  GlobalComparisonError,
  GlobalComparisonResponse,
} from "@/lib/types/global-comparison";
import { NextRequest, NextResponse } from "next/server";

const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 10;

const requestCounts = new Map<string, { count: number; resetTime: number }>();

const packageValidationCache = new Map<
  string,
  { isValid: boolean; timestamp: number }
>();
const VALIDATION_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const realIP = request.headers.get("x-real-ip");
  return forwarded?.split(",")[0] || realIP || "unknown";
}

function isRateLimited(clientIP: string): boolean {
  const now = Date.now();
  const clientData = requestCounts.get(clientIP);

  if (!clientData || now > clientData.resetTime) {
    requestCounts.set(clientIP, {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW,
    });
    return false;
  }

  if (clientData.count >= MAX_REQUESTS_PER_WINDOW) {
    return true;
  }

  clientData.count++;
  return false;
}

function isValidPackageName(name: string): boolean {
  const npmNameRegex =
    /^(?:@[a-z0-9-*~][a-z0-9-*._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/;

  if (!name || typeof name !== "string") return false;
  if (name.length < 1 || name.length > 214) return false;
  if (name.startsWith(".") || name.startsWith("_")) return false;
  if (!npmNameRegex.test(name.toLowerCase())) return false;

  return true;
}

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
      comparisons: uniqueComparisons,
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
): Promise<NextResponse<GlobalComparison | GlobalComparisonError>> {
  try {
    const clientIP = getClientIP(request);

    if (isRateLimited(clientIP)) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Too many requests." },
        { status: 429 },
      );
    }

    const body: CreateGlobalComparisonRequest = await request.json();

    if (!Array.isArray(body.projects) || body.projects.length === 0) {
      return NextResponse.json(
        { error: "Invalid request body. Projects array required." },
        { status: 400 },
      );
    }

    const { validPackages, invalidPackages } = await validateAndFilterPackages(
      body.projects,
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

    const response: any = newComparison;
    if (invalidPackages.length > 0) {
      response.validation = {
        invalidPackages,
        message: `${validPackages.length} valid packages stored. ${invalidPackages.length} packages filtered out.`,
      };
    }

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
