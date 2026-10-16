/**
 * @vitest-environment node
 */
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { GET } from "./route";

const { checkRateLimitMock, getComparisonsMock } = vi.hoisted(() => ({
  checkRateLimitMock: vi.fn(),
  getComparisonsMock: vi.fn(),
}));

vi.mock("@/lib/utils/rateLimit", () => ({
  checkRateLimit: checkRateLimitMock,
}));

vi.mock("@/lib/storage/comparisons-storage", () => ({
  comparisonsStorage: { getComparisons: getComparisonsMock },
}));

const buildRequest = (query = "", ip = "10.3.0.1") =>
  new NextRequest(`http://localhost/api/comparisons/popular${query}`, {
    headers: { "x-real-ip": ip },
  });

const comparisonsFor = (count: number) =>
  Array.from({ length: count }, (_, index) => ({
    id: `${index}`,
    timestamp: Date.now(),
    projects: [`pkg-${index}`, "react"],
  }));

beforeEach(() => {
  checkRateLimitMock.mockReset();
  checkRateLimitMock.mockResolvedValue(false);
  getComparisonsMock.mockReset();
  getComparisonsMock.mockResolvedValue(comparisonsFor(60));
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("GET /api/comparisons/popular", () => {
  test.each([
    ["", 20],
    ["?limit=6", 6],
    ["?limit=50", 50],
    ["?limit=500", 20],
    ["?limit=0", 20],
    ["?limit=nope", 20],
  ])("query %s returns %i comparisons", async (query, expected) => {
    const response = await GET(buildRequest(query));

    const body = await response.json();
    expect(body.comparisons).toHaveLength(expected);
  });

  test("sets CDN cache headers on success and no-store on errors", async () => {
    const ok = await GET(buildRequest());
    expect(ok.headers.get("Cache-Control")).toBe(
      "public, s-maxage=300, stale-while-revalidate=3600",
    );

    getComparisonsMock.mockRejectedValue(new Error("boom"));
    const failed = await GET(buildRequest());
    expect(failed.headers.get("Cache-Control")).toBe("no-store");
  });

  test("rate limits reads per client IP at 60 per minute", async () => {
    await GET(buildRequest("", "4.4.4.4"));

    expect(checkRateLimitMock).toHaveBeenCalledWith(
      "comparisons-popular:4.4.4.4",
      { windowMs: 60 * 1000, maxRequests: 60 },
    );
  });

  test("returns 429 without reading storage when rate limited", async () => {
    checkRateLimitMock.mockResolvedValue(true);

    const response = await GET(buildRequest());

    expect(response.status).toBe(429);
    expect(getComparisonsMock).not.toHaveBeenCalled();
  });

  test("returns a generic 500 when storage fails", async () => {
    getComparisonsMock.mockRejectedValue(new Error("redis secret"));

    const response = await GET(buildRequest());

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "Failed to read popular comparisons",
    });
  });

  test("excludes comparisons older than the 7 day trending window", async () => {
    const day = 24 * 60 * 60 * 1000;
    getComparisonsMock.mockResolvedValue([
      { id: "old", timestamp: Date.now() - 8 * day, projects: ["old-a", "b"] },
      { id: "new", timestamp: Date.now() - day / 2, projects: ["new-a", "b"] },
    ]);

    const body = await (await GET(buildRequest())).json();

    expect(
      body.comparisons.map((c: { projects: string[] }) => c.projects),
    ).toEqual([["new-a", "b"]]);
    expect(body.total).toBe(1);
  });

  test("groups combinations regardless of order and tracks count and lastUsed", async () => {
    const now = Date.now();
    getComparisonsMock.mockResolvedValue([
      { id: "1", timestamp: now - 5000, projects: ["a", "b"] },
      { id: "2", timestamp: now - 1000, projects: ["b", "a"] },
    ]);

    const body = await (await GET(buildRequest())).json();

    expect(body.comparisons).toEqual([
      {
        projects: ["a", "b"],
        count: 2,
        lastUsed: now - 1000,
        averageProjectsCount: 2,
      },
    ]);
  });

  test("ranks by trending score, weighting the last 24 hours highest", async () => {
    const day = 24 * 60 * 60 * 1000;
    const now = Date.now();
    getComparisonsMock.mockResolvedValue([
      { id: "1", timestamp: now - 3 * day, projects: ["old-1", "x"] },
      { id: "2", timestamp: now - 4 * day, projects: ["old-1", "x"] },
      { id: "3", timestamp: now - 1000, projects: ["hot", "x"] },
      { id: "4", timestamp: now - 2000, projects: ["hot", "x"] },
    ]);

    const body = await (await GET(buildRequest())).json();

    expect(body.comparisons[0].projects).toEqual(["hot", "x"]);
    expect(body.comparisons[1].projects).toEqual(["old-1", "x"]);
  });

  test("breaks equal trending scores by comparison count", async () => {
    const day = 24 * 60 * 60 * 1000;
    const now = Date.now();
    getComparisonsMock.mockResolvedValue([
      { id: "1", timestamp: now - 1000, projects: ["single", "x"] },
      { id: "2", timestamp: now - 2 * day, projects: ["double", "x"] },
      { id: "3", timestamp: now - 3 * day, projects: ["double", "x"] },
    ]);

    const body = await (await GET(buildRequest())).json();

    expect(body.comparisons.map((c: { count: number }) => c.count)).toEqual([
      2, 1,
    ]);
  });
});
