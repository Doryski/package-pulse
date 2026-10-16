/**
 * @vitest-environment node
 */
import { SELECTED_PROJECTS_LIMIT } from "@/lib/config/constants";
import { beforeEach, describe, expect, test, vi } from "vitest";
import {
  CACHE_CONTROL,
  errorResponse,
  getPackageListError,
  jsonResponse,
  PACKAGE_LIST_RATE_LIMIT,
  parsePackagesRequest,
  successCacheControl,
} from "./packageListRequest";

const { checkRateLimitMock } = vi.hoisted(() => ({
  checkRateLimitMock:
    vi.fn<(key: string, options: object) => Promise<boolean>>(),
}));

vi.mock("@/lib/utils/rateLimit", () => ({
  checkRateLimit: checkRateLimitMock,
}));

const buildRequest = (packages: string | null, ip = "203.0.113.7") => {
  const url = new URL("http://localhost/api/test");
  if (packages !== null) url.searchParams.set("packages", packages);
  return new Request(url, { headers: { "x-real-ip": ip } });
};

const rejectedBody = async (
  result: Awaited<ReturnType<typeof parsePackagesRequest>>,
) => {
  if (result.ok) throw new Error("expected a rejected request");
  return {
    status: result.response.status,
    cacheControl: result.response.headers.get("Cache-Control"),
    body: await result.response.json(),
  };
};

beforeEach(() => {
  checkRateLimitMock.mockReset();
  checkRateLimitMock.mockResolvedValue(false);
});

describe("parsePackagesRequest", () => {
  test("returns the sorted, deduped package list", async () => {
    const result = await parsePackagesRequest(
      buildRequest("react, vue,react,@scope/pkg"),
      { routeKey: "package-info" },
    );
    expect(result).toEqual({
      ok: true,
      packages: ["@scope/pkg", "react", "vue"],
    });
  });

  test("keys the rate limit by route and client ip with the default limit", async () => {
    await parsePackagesRequest(buildRequest("react"), {
      routeKey: "package-info",
    });
    expect(checkRateLimitMock).toHaveBeenCalledWith(
      "package-info:203.0.113.7",
      PACKAGE_LIST_RATE_LIMIT,
    );
  });

  test("accepts a custom rate limit", async () => {
    const rateLimit = { windowMs: 1000, maxRequests: 1 };
    await parsePackagesRequest(buildRequest("react"), {
      routeKey: "deps-dev",
      rateLimit,
    });
    expect(checkRateLimitMock).toHaveBeenCalledWith(
      "deps-dev:203.0.113.7",
      rateLimit,
    );
  });

  test("rejects rate-limited clients with 429 no-store", async () => {
    checkRateLimitMock.mockResolvedValue(true);
    const result = await parsePackagesRequest(buildRequest("react"), {
      routeKey: "package-info",
    });
    await expect(rejectedBody(result)).resolves.toEqual({
      status: 429,
      cacheControl: "no-store",
      body: { error: "Rate limit exceeded. Too many requests." },
    });
  });

  test("rejects a missing packages param with 400", async () => {
    const result = await parsePackagesRequest(buildRequest(null), {
      routeKey: "package-info",
    });
    await expect(rejectedBody(result)).resolves.toMatchObject({
      status: 400,
      cacheControl: "no-store",
      body: { error: "No packages provided." },
    });
  });

  test("rejects invalid package names with 400", async () => {
    const result = await parsePackagesRequest(buildRequest("react,Bad Name"), {
      routeKey: "package-info",
    });
    await expect(rejectedBody(result)).resolves.toMatchObject({
      status: 400,
      body: { error: "Invalid package names: Bad Name" },
    });
  });

  test("validates entries with a custom validator", async () => {
    const isValidEntry = (entry: string) => entry.startsWith("ok");
    const accepted = await parsePackagesRequest(buildRequest("ok@1.0.0"), {
      routeKey: "bundle-size",
      isValidEntry,
    });
    expect(accepted).toEqual({ ok: true, packages: ["ok@1.0.0"] });

    const result = await parsePackagesRequest(buildRequest("ok,bad"), {
      routeKey: "bundle-size",
      isValidEntry,
    });
    await expect(rejectedBody(result)).resolves.toMatchObject({
      status: 400,
      body: { error: "Invalid package names: bad" },
    });
  });
});

describe("getPackageListError", () => {
  test("accepts a valid list", () => {
    expect(getPackageListError(["react"])).toBeUndefined();
  });

  test("rejects an empty list", () => {
    expect(getPackageListError([])).toBe("No packages provided.");
  });

  test("rejects more than the selection limit", () => {
    const packages = Array.from(
      { length: SELECTED_PROJECTS_LIMIT + 1 },
      (_, index) => `pkg-${index}`,
    );
    expect(getPackageListError(packages)).toBe(
      `A maximum of ${SELECTED_PROJECTS_LIMIT} packages is allowed.`,
    );
  });
});

describe("response helpers", () => {
  test("jsonResponse defaults to no-store", async () => {
    const response = jsonResponse({ data: 1 }, 200);
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    await expect(response.json()).resolves.toEqual({ data: 1 });
  });

  test("jsonResponse applies the given cache header", () => {
    const response = jsonResponse({}, 200, CACHE_CONTROL.success);
    expect(response.headers.get("Cache-Control")).toBe(
      "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400",
    );
  });

  test("errorResponse wraps the message", async () => {
    const response = errorResponse("boom", 502);
    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({ error: "boom" });
  });

  test("successCacheControl drops caching on transient errors", () => {
    expect(successCacheControl(false)).toBe(CACHE_CONTROL.success);
    expect(successCacheControl(true)).toBe(CACHE_CONTROL.noStore);
  });
});
