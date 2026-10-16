/**
 * @vitest-environment node
 */
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { GET, POST } from "./route";

const { checkRateLimitMock, storageMock, uniqueMock } = vi.hoisted(() => ({
  checkRateLimitMock: vi.fn(),
  storageMock: {
    getComparisons: vi.fn(),
    addComparison: vi.fn(),
  },
  uniqueMock: vi.fn(),
}));

vi.mock("@/lib/utils/rateLimit", () => ({
  checkRateLimit: checkRateLimitMock,
}));

vi.mock("@/lib/storage/comparisons-storage", () => ({
  comparisonsStorage: storageMock,
  getUniqueComparisons: uniqueMock,
}));

const fetchMock = vi.fn();

let ipCounter = 0;
const uniqueIp = () => `10.2.0.${++ipCounter}`;

const getRequest = (query = "", headers: Record<string, string> = {}) =>
  new NextRequest(`http://localhost/api/comparisons${query}`, {
    headers: { "x-real-ip": uniqueIp(), ...headers },
  });

const postRequest = (
  body: unknown,
  headers: Record<string, string> = { origin: "http://localhost" },
) =>
  new NextRequest("http://localhost/api/comparisons", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "x-real-ip": uniqueIp(), ...headers },
  });

beforeEach(() => {
  checkRateLimitMock.mockReset();
  checkRateLimitMock.mockResolvedValue(false);
  storageMock.getComparisons.mockReset();
  storageMock.getComparisons.mockResolvedValue([]);
  storageMock.addComparison.mockReset();
  storageMock.addComparison.mockResolvedValue(undefined);
  uniqueMock.mockReset();
  uniqueMock.mockReturnValue([]);
  fetchMock.mockReset();
  fetchMock.mockResolvedValue(new Response(null, { status: 200 }));
  vi.stubGlobal("fetch", fetchMock);
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("GET /api/comparisons", () => {
  test.each([
    [undefined, 20],
    ["", 20],
    ["6", 6],
    ["50", 50],
    ["51", 20],
    ["0", 20],
    ["-3", 20],
    ["2.5", 20],
    ["abc", 20],
  ])("parses limit=%s as %i", async (limit, expected) => {
    const query = limit === undefined ? "" : `?limit=${limit}`;
    await GET(getRequest(query));

    expect(uniqueMock).toHaveBeenCalledWith([], expected);
  });

  test("rate limits reads per client IP at 60 per minute", async () => {
    await GET(getRequest("", { "x-real-ip": "1.1.1.1" }));

    expect(checkRateLimitMock).toHaveBeenCalledWith(
      "comparisons-read:1.1.1.1",
      { windowMs: 60 * 1000, maxRequests: 60 },
    );
  });

  test("returns 429 without reading storage when rate limited", async () => {
    checkRateLimitMock.mockResolvedValue(true);

    const response = await GET(getRequest());

    expect(response.status).toBe(429);
    expect(storageMock.getComparisons).not.toHaveBeenCalled();
  });

  test("returns a generic 500 without internals when storage fails", async () => {
    storageMock.getComparisons.mockRejectedValue(new Error("redis secret"));

    const response = await GET(getRequest());

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "Failed to read comparisons",
    });
  });
});

describe("POST /api/comparisons", () => {
  test("stores a comparison from a same-origin request", async () => {
    const response = await POST(postRequest({ projects: ["react"] }));

    expect(response.status).toBe(201);
    expect(storageMock.addComparison).toHaveBeenCalledTimes(1);
  });

  test("accepts a same-origin Referer when Origin is absent", async () => {
    const response = await POST(
      postRequest(
        { projects: ["react"] },
        { referer: "http://localhost/compare/react" },
      ),
    );

    expect(response.status).toBe(201);
  });

  test("accepts a same-origin request behind a proxy that rewrites Host", async () => {
    const response = await POST(
      new NextRequest("http://internal:3000/api/comparisons", {
        method: "POST",
        body: JSON.stringify({ projects: ["react"] }),
        headers: {
          "x-real-ip": uniqueIp(),
          host: "internal:3000",
          "x-forwarded-host": "www.package-pulse.com",
          origin: "https://www.package-pulse.com",
        },
      }),
    );

    expect(response.status).toBe(201);
  });

  test("rejects an Origin that matches neither the forwarded nor the direct host", async () => {
    const response = await POST(
      postRequest(
        { projects: ["react"] },
        {
          origin: "http://localhost",
          "x-forwarded-host": "www.package-pulse.com",
        },
      ),
    );

    expect(response.status).toBe(403);
  });

  test.each([
    ["a cross-site Origin", { origin: "https://evil.example" }],
    [
      "a cross-site Origin with a same-origin Referer",
      { origin: "https://evil.example", referer: "http://localhost/" },
    ],
    ["a cross-site Referer", { referer: "https://evil.example/page" }],
    ["no Origin or Referer", {}],
    ["a malformed Origin", { origin: "null" }],
  ])("rejects %s with 403", async (_label, headers) => {
    const response = await POST(postRequest({ projects: ["react"] }, headers));

    expect(response.status).toBe(403);
    expect(checkRateLimitMock).not.toHaveBeenCalled();
    expect(storageMock.addComparison).not.toHaveBeenCalled();
  });

  test("rate limits writes with the existing key and limits", async () => {
    await POST(
      postRequest(
        { projects: ["react"] },
        { origin: "http://localhost", "x-real-ip": "2.2.2.2" },
      ),
    );

    expect(checkRateLimitMock).toHaveBeenCalledWith("comparisons:2.2.2.2", {
      windowMs: 60 * 1000,
      maxRequests: 10,
    });
  });

  test("returns 429 when rate limited", async () => {
    checkRateLimitMock.mockResolvedValue(true);

    const response = await POST(postRequest({ projects: ["react"] }));

    expect(response.status).toBe(429);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test("checks package existence with a HEAD request and registry encoding", async () => {
    await POST(postRequest({ projects: ["@scope/existence-check"] }));

    expect(fetchMock).toHaveBeenCalledWith(
      "https://registry.npmjs.org/@scope%2Fexistence-check",
      expect.objectContaining({
        method: "HEAD",
        headers: { Accept: "application/vnd.npm.install-v1+json" },
      }),
    );
  });

  test("caches package existence lookups", async () => {
    await POST(postRequest({ projects: ["cache-hit-pkg"] }));
    await POST(postRequest({ projects: ["cache-hit-pkg"] }));

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  test("filters out packages the registry does not know", async () => {
    fetchMock.mockImplementation(async (url: string) =>
      url.endsWith("missing-pkg")
        ? new Response(null, { status: 404 })
        : new Response(null, { status: 200 }),
    );

    const response = await POST(
      postRequest({ projects: ["present-pkg", "missing-pkg"] }),
    );

    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.projects).toEqual(["present-pkg"]);
    expect(body.validation.invalidPackages).toEqual(["missing-pkg"]);
  });

  test("returns a generic 500 without error details when storage fails", async () => {
    storageMock.addComparison.mockRejectedValue(new Error("redis secret"));

    const response = await POST(postRequest({ projects: ["storage-fail"] }));

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "Failed to create comparison",
    });
  });

  test("never exposes clientIP or userAgent", async () => {
    const response = await POST(
      postRequest(
        { projects: ["public-shape"] },
        { origin: "http://localhost", "user-agent": "agent" },
      ),
    );

    const body = await response.json();
    expect(body).not.toHaveProperty("clientIP");
    expect(body).not.toHaveProperty("userAgent");
  });
});
