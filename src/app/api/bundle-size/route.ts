import { getBundleSizes, isValidPackageSpec } from "@/lib/server/bundleSize";
import { createPackageListRoute } from "@/lib/server/packageListRoute";

export const runtime = "nodejs";
export const maxDuration = 30;

export const GET = createPackageListRoute({
  routeKey: "bundle-size",
  failureMessage: "Failed to fetch bundle sizes",
  load: getBundleSizes,
  isValidEntry: isValidPackageSpec,
});
