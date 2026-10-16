import {
  failed,
  found,
  missing,
  toPackageResults,
} from "@/lib/server/packageResults";
import { getPackageInfo } from "@/lib/server/packageInfo";
import { createPackageListRoute } from "@/lib/server/packageListRoute";
import { mapWithConcurrency } from "@/lib/utils/mapWithConcurrency";

export const runtime = "nodejs";
export const maxDuration = 30;

const CONCURRENCY = 2;

const loadOutcome = async (name: string) => {
  try {
    const info = await getPackageInfo(name);
    if (!info) return missing(name);
    return found(name, info);
  } catch (error) {
    console.error(`Error loading package info for "${name}":`, error);
    return failed(name);
  }
};

const loadPackagesInfo = async (packages: string[]) =>
  toPackageResults(
    await mapWithConcurrency(packages, CONCURRENCY, loadOutcome),
  );

export const GET = createPackageListRoute({
  routeKey: "package-info",
  failureMessage: "Failed to fetch package info",
  load: loadPackagesInfo,
});
