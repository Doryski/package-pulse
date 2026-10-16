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
});
