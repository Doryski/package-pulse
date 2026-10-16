import "server-only";
import { parsePackageList } from "@/api/fetchNpmDownloadsAdaptive";
import { SELECTED_PROJECTS_LIMIT } from "@/lib/config/constants";
import getClientIp from "@/lib/utils/getClientIp";
import isValidPackageName from "@/lib/utils/isValidPackageName";
import { checkRateLimit } from "@/lib/utils/rateLimit";
import { NextResponse } from "next/server";

export const PACKAGE_LIST_RATE_LIMIT = {
  windowMs: 60 * 1000,
  maxRequests: 20,
} as const;

export const CACHE_CONTROL = {
  success: "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400",
  noStore: "no-store",
} as const;

type RateLimit = { windowMs: number; maxRequests: number };

type EntryValidator = (entry: string) => boolean;

type ParsePackagesOptions = {
  routeKey: string;
  rateLimit?: RateLimit;
  isValidEntry?: EntryValidator;
};

type ParsedPackagesRequest =
  { ok: true; packages: string[] } | { ok: false; response: NextResponse };

export const jsonResponse = <T>(
  body: T,
  status: number,
  cacheControl: string = CACHE_CONTROL.noStore,
) =>
  NextResponse.json(body, {
    status,
    headers: { "Cache-Control": cacheControl },
  });

export const errorResponse = (error: string, status: number) =>
  jsonResponse({ error }, status);

export const successCacheControl = (hasTransientErrors: boolean) => {
  if (hasTransientErrors) return CACHE_CONTROL.noStore;
  return CACHE_CONTROL.success;
};

export const getPackageListError = (
  packages: readonly string[],
  isValidEntry: EntryValidator = isValidPackageName,
) => {
  if (packages.length === 0) return "No packages provided.";
  if (packages.length > SELECTED_PROJECTS_LIMIT) {
    return `A maximum of ${SELECTED_PROJECTS_LIMIT} packages is allowed.`;
  }
  const invalidPackages = packages.filter((name) => !isValidEntry(name));
  if (invalidPackages.length === 0) return undefined;
  return `Invalid package names: ${invalidPackages.join(", ")}`;
};

const rejected = (error: string, status: number): ParsedPackagesRequest => ({
  ok: false,
  response: errorResponse(error, status),
});

export async function parsePackagesRequest(
  request: Request,
  {
    routeKey,
    rateLimit = PACKAGE_LIST_RATE_LIMIT,
    isValidEntry = isValidPackageName,
  }: ParsePackagesOptions,
): Promise<ParsedPackagesRequest> {
  const clientIP = getClientIp(request.headers);
  if (await checkRateLimit(`${routeKey}:${clientIP}`, rateLimit)) {
    return rejected("Rate limit exceeded. Too many requests.", 429);
  }

  const { searchParams } = new URL(request.url);
  const packages = parsePackageList(searchParams.get("packages"));
  const error = getPackageListError(packages, isValidEntry);
  if (error) return rejected(error, 400);

  return { ok: true, packages };
}
