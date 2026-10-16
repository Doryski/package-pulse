/**
 * @vitest-environment node
 */
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { GET } from "./route";

const CLIENT_MAX_REQUESTS = 10;
const GLOBAL_MAX_REQUESTS = 500;
const SUCCESS_CACHE_CONTROL =
  "public, s-maxage=86400, stale-while-revalidate=86400";

const {
  openaiCreate,
  checkRateLimitMock,
  getCachedMock,
  setCachedMock,
  envState,
} = vi.hoisted(() => ({
  openaiCreate: vi.fn(),
  checkRateLimitMock: vi.fn(),
  getCachedMock: vi.fn(),
  setCachedMock: vi.fn(),
  envState: { NODE_ENV: "test", OPENAI_API_KEY: "test-key" } as Record<
    string,
    string | undefined
  >,
}));

vi.mock("@/lib/config/env", () => ({ env: envState }));

vi.mock("openai", () => ({
  default: vi.fn().mockImplementation(function () {
    return { responses: { create: openaiCreate } };
  }),
}));

vi.mock("openai/helpers/zod.mjs", () => ({
  zodTextFormat: () => ({}),
}));

vi.mock("@/lib/server/npmRegistry", () => ({
  fetchLatestManifest: async (name: string) => ({ name, version: "1.0.0" }),
  fetchPackageExists: async () => true,
}));

vi.mock("@/lib/utils/rateLimit", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/utils/rateLimit")>();
  checkRateLimitMock.mockImplementation(
    async (...args: Parameters<typeof actual.checkRateLimit>) =>
      actual.default(...args),
  );
  return { ...actual, checkRateLimit: checkRateLimitMock };
});

vi.mock("@/lib/storage/kvCache", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/storage/kvCache")>();
  getCachedMock.mockImplementation(actual.getCached);
  setCachedMock.mockImplementation(actual.setCached);
  return { getCached: getCachedMock, setCached: setCachedMock };
});

let counter = 0;
const nextId = () => (counter += 1);

const createRequest = (packages: string, ip = `10.1.0.${nextId()}`) =>
  new NextRequest(
    `http://localhost/api/similar-projects?packages=${encodeURIComponent(packages)}`,
    { headers: { "x-real-ip": ip } },
  );

const uniquePackage = () => `pkg-${nextId()}`;

const respondWith = (similarProjects: string[]) => ({
  output_text: JSON.stringify({ similarProjects }),
});

beforeEach(() => {
  vi.clearAllMocks();
  envState.PP_E2E_TEST_PROXY = undefined;
  openaiCreate.mockResolvedValue(respondWith(["vue"]));
});

describe("GET /api/similar-projects", () => {
  test("returns suggestions with CDN cache headers", async () => {
    const response = await GET(createRequest(uniquePackage()));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ similarProjects: ["vue"] });
    expect(response.headers.get("Cache-Control")).toBe(SUCCESS_CACHE_CONTROL);
  });

  test.each([
    ["missing", ""],
    ["invalid", "react<script>"],
  ])("rejects %s packages with 400 without calling OpenAI", async (_, raw) => {
    const response = await GET(createRequest(raw));

    expect(response.status).toBe(400);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(openaiCreate).not.toHaveBeenCalled();
  });

  test("B13: two identical requests reach OpenAI once", async () => {
    const pkg = uniquePackage();

    const first = await GET(createRequest(`${pkg},React`));
    const second = await GET(createRequest(`react,${pkg.toUpperCase()}`));

    expect(await first.json()).toEqual({ similarProjects: ["vue"] });
    expect(await second.json()).toEqual({ similarProjects: ["vue"] });
    expect(second.headers.get("Cache-Control")).toBe(SUCCESS_CACHE_CONTROL);
    expect(openaiCreate).toHaveBeenCalledTimes(1);
    expect(setCachedMock).toHaveBeenCalledWith(
      `similar:${pkg},react`,
      ["vue"],
      7 * 24 * 60 * 60,
    );
  });

  test("does not cache an empty suggestion list", async () => {
    openaiCreate.mockResolvedValue(respondWith([]));

    const response = await GET(createRequest(uniquePackage()));

    expect(await response.json()).toEqual({ similarProjects: [] });
    expect(setCachedMock).not.toHaveBeenCalled();
  });

  test("checks the cache before the rate limiter", async () => {
    const pkg = uniquePackage();
    const ip = `10.2.0.${nextId()}`;
    await GET(createRequest(pkg, ip));
    checkRateLimitMock.mockClear();

    for (let attempt = 0; attempt < CLIENT_MAX_REQUESTS; attempt += 1) {
      await GET(createRequest(uniquePackage(), ip));
    }
    expect(
      await (await GET(createRequest(uniquePackage(), ip))).json(),
    ).toEqual({ similarProjects: [] });

    checkRateLimitMock.mockClear();
    const cached = await GET(createRequest(pkg, ip));

    expect(await cached.json()).toEqual({ similarProjects: ["vue"] });
    expect(checkRateLimitMock).not.toHaveBeenCalled();
  });

  test("returns [] with no-store when the client is rate limited", async () => {
    const ip = `10.3.0.${nextId()}`;
    for (let attempt = 0; attempt < CLIENT_MAX_REQUESTS; attempt += 1) {
      await GET(createRequest(uniquePackage(), ip));
    }

    const response = await GET(createRequest(uniquePackage(), ip));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ similarProjects: [] });
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(openaiCreate).toHaveBeenCalledTimes(CLIENT_MAX_REQUESTS);
  });

  test("checks client and global limits for each uncached request", async () => {
    await GET(createRequest(uniquePackage(), "10.4.0.1"));

    expect(checkRateLimitMock).toHaveBeenCalledWith(
      "similar-projects:10.4.0.1",
      { windowMs: 60_000, maxRequests: CLIENT_MAX_REQUESTS },
    );
    expect(checkRateLimitMock).toHaveBeenCalledWith("similar-projects:global", {
      windowMs: 86_400_000,
      maxRequests: GLOBAL_MAX_REQUESTS,
    });
  });

  test("returns [] when the global limit is reached", async () => {
    checkRateLimitMock.mockResolvedValueOnce(false).mockResolvedValueOnce(true);

    const response = await GET(createRequest(uniquePackage()));

    expect(await response.json()).toEqual({ similarProjects: [] });
    expect(openaiCreate).not.toHaveBeenCalled();
  });

  test("skips the global limit and the cache in E2E test mode", async () => {
    envState.PP_E2E_TEST_PROXY = "1";
    const pkg = uniquePackage();

    await GET(createRequest(pkg));
    await GET(createRequest(pkg));

    expect(openaiCreate).toHaveBeenCalledTimes(2);
    expect(getCachedMock).not.toHaveBeenCalled();
    expect(setCachedMock).not.toHaveBeenCalled();
    expect(checkRateLimitMock).not.toHaveBeenCalledWith(
      "similar-projects:global",
      expect.anything(),
    );
  });

  test("returns 502 with no-store and caches nothing when OpenAI fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    openaiCreate.mockRejectedValue(new Error("upstream down"));

    const response = await GET(createRequest(uniquePackage()));

    expect(response.status).toBe(502);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(setCachedMock).not.toHaveBeenCalled();
  });
});
