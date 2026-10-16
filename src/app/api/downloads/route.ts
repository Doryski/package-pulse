import fetchNpmDownloadsAdaptive from "@/api/fetchNpmDownloadsAdaptive";
import { SELECTED_PROJECTS_LIMIT } from "@/lib/config/constants";
import { isAppError } from "@/lib/utils/AppError";
import getClientIp from "@/lib/utils/getClientIp";
import isRateLimited from "@/lib/utils/rateLimit";
import isValidPackageName from "@/lib/utils/isValidPackageName";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const RATE_LIMIT = { windowMs: 60 * 1000, maxRequests: 20 } as const;

export async function GET(request: NextRequest) {
  const clientIP = getClientIp(request.headers);
  if (isRateLimited(`downloads:${clientIP}`, RATE_LIMIT)) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Too many requests." },
      { status: 429 },
    );
  }

  const { searchParams } = new URL(request.url);
  const packages = (searchParams.get("packages") || "")
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean);

  if (packages.length === 0) {
    return NextResponse.json(
      { error: "No packages provided." },
      { status: 400 },
    );
  }

  if (packages.length > SELECTED_PROJECTS_LIMIT) {
    return NextResponse.json(
      { error: `A maximum of ${SELECTED_PROJECTS_LIMIT} packages is allowed.` },
      { status: 400 },
    );
  }

  const invalidPackages = packages.filter((name) => !isValidPackageName(name));
  if (invalidPackages.length > 0) {
    return NextResponse.json(
      { error: `Invalid package names: ${invalidPackages.join(", ")}` },
      { status: 400 },
    );
  }

  try {
    const { data, errors, stats } = await fetchNpmDownloadsAdaptive(packages);
    return NextResponse.json({ data, errors, stats });
  } catch (error) {
    const message = isAppError(error)
      ? error.message
      : "Failed to fetch NPM download data";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
