import "server-only";
import {
  errorResponse,
  jsonResponse,
  parsePackagesRequest,
  successCacheControl,
} from "@/lib/server/packageListRequest";
import {
  hasUpstreamErrors,
  type PackageResults,
} from "@/lib/server/packageResults";

type PackageListRouteOptions<T> = {
  routeKey: string;
  failureMessage: string;
  load: (packages: string[]) => Promise<PackageResults<T>>;
  isValidEntry?: (entry: string) => boolean;
};

export const createPackageListRoute =
  <T>({
    routeKey,
    failureMessage,
    load,
    isValidEntry,
  }: PackageListRouteOptions<T>) =>
  async (request: Request) => {
    const parsed = await parsePackagesRequest(request, {
      routeKey,
      isValidEntry,
    });
    if (!parsed.ok) return parsed.response;

    try {
      const result = await load(parsed.packages);
      const cacheControl = successCacheControl(
        hasUpstreamErrors(result.errors),
      );
      return jsonResponse(result, 200, cacheControl);
    } catch (error) {
      console.error(`Error in GET /api/${routeKey}:`, error);
      return errorResponse(failureMessage, 500);
    }
  };
