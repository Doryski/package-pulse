import { getDepsDevInfo } from "@/lib/server/depsDev";
import { createPackageListRoute } from "@/lib/server/packageListRoute";

export const runtime = "nodejs";
export const maxDuration = 30;

export const GET = createPackageListRoute({
  routeKey: "deps-dev",
  failureMessage: "Failed to fetch deps.dev data",
  load: getDepsDevInfo,
});
