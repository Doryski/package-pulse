import fetchNpmDownloadsAdaptive from "@/api/fetchNpmDownloadsAdaptive";
import { SELECTED_PROJECTS_LIMIT } from "@/lib/config/constants";
import { isAppError } from "@/lib/utils/AppError";
import getClientIp from "@/lib/utils/getClientIp";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const RATE_LIMIT_WINDOW = 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 20;

const requestCounts = new Map<string, { count: number; resetTime: number }>();

const RATE_LIMIT_SWEEP_THRESHOLD = 10_000;

function sweepExpired(now: number): void {
  if (requestCounts.size < RATE_LIMIT_SWEEP_THRESHOLD) return;
  for (const [ip, data] of requestCounts) {
    if (now > data.resetTime) requestCounts.delete(ip);
  }
}

function isRateLimited(clientIP: string): boolean {
  const now = Date.now();
  const clientData = requestCounts.get(clientIP);

  if (!clientData || now > clientData.resetTime) {
    sweepExpired(now);
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
  if (!npmNameRegex.test(name)) return false;

  return true;
}

export async function GET(request: NextRequest) {
  const clientIP = getClientIp(request.headers);
  if (isRateLimited(clientIP)) {
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
