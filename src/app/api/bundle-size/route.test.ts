/**
 * @vitest-environment node
 */
import { beforeEach, describe, expect, test, vi } from "vitest";
import { GET, maxDuration, runtime } from "./route";

const { getBundleSizesMock, checkRateLimitMock } = vi.hoisted(() => ({
  getBundleSizesMock: vi.fn(),
  checkRateLimitMock: vi.fn(),
}));

vi.mock("@/lib/server/bundleSize", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/server/bundleSize")>()),
  getBundleSizes: getBundleSizesMock,
}));

vi.mock("@/lib/utils/rateLimit", () => ({
  checkRateLimit: checkRateLimitMock,
}));

const SUCCESS_CACHE_CONTROL =
  "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400";

const bundleSize = {
  version: "18.2.0",
  size: 1000,
  gzip: 400,
  dependencyCount: 2,
  treeShakeable: true,
};

const request = (packages: string) =>
  new Request(
    `http://localhost/api/bundle-size?packages=${encodeURIComponent(packages)}`,
    { headers: { "x-real-ip": "198.51.100.4" } },
  );

const read = async (response: Response) => ({
  status: response.status,
  cacheControl: response.headers.get("Cache-Control"),
  body: await response.json(),
});

beforeEach(() => {
  getBundleSizesMock.mockReset();
  checkRateLimitMock.mockReset();
  checkRateLimitMock.mockResolvedValue(false);
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

describe("GET /api/bundle-size", () => {
  test("runs on node with a 30 s budget", () => {
    expect(runtime).toBe("nodejs");
    expect(maxDuration).toBe(30);
  });

  test("returns sizes for sorted name@version entries with the success header", async () => {
    getBundleSizesMock.mockResolvedValue({
      data: { react: bundleSize },
      errors: {},
    });

    const response = await GET(request("react@18.2.0,@scope/pkg,react@18.2.0"));

    await expect(read(response)).resolves.toEqual({
      status: 200,
      cacheControl: SUCCESS_CACHE_CONTROL,
      body: { data: { react: bundleSize }, errors: {} },
    });
    expect(getBundleSizesMock).toHaveBeenCalledWith([
      "@scope/pkg",
      "react@18.2.0",
    ]);
    expect(checkRateLimitMock).toHaveBeenCalledWith(
      "bundle-size:198.51.100.4",
      expect.objectContaining({ maxRequests: 20 }),
    );
  });

  test("keeps caching when a package is only missing", async () => {
    getBundleSizesMock.mockResolvedValue({
      data: { gone: null },
      errors: { gone: "notFound" },
    });
    const response = await GET(request("gone"));
    expect(response.headers.get("Cache-Control")).toBe(SUCCESS_CACHE_CONTROL);
  });

  test("is no-store when a package failed upstream", async () => {
    getBundleSizesMock.mockResolvedValue({
      data: { react: null },
      errors: { react: "upstream" },
    });
    const response = await GET(request("react"));
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });

  test.each(["react@", "Bad Name", "react@1 0"])(
    "rejects %s with 400",
    async (spec) => {
      const { status, cacheControl, body } = await read(
        await GET(request(spec)),
      );
      expect({ status, cacheControl }).toEqual({
        status: 400,
        cacheControl: "no-store",
      });
      expect(body.error).toMatch(/^Invalid package names/);
      expect(getBundleSizesMock).not.toHaveBeenCalled();
    },
  );

  test("rejects rate-limited clients with 429", async () => {
    checkRateLimitMock.mockResolvedValue(true);
    const response = await GET(request("react"));
    expect(response.status).toBe(429);
  });

  test("returns 500 no-store when loading throws", async () => {
    getBundleSizesMock.mockRejectedValue(new Error("boom"));

    await expect(read(await GET(request("react")))).resolves.toEqual({
      status: 500,
      cacheControl: "no-store",
      body: { error: "Failed to fetch bundle sizes" },
    });
  });
});
