/**
 * @vitest-environment node
 */
import AppError from "@/lib/utils/AppError";
import { SELECTED_PROJECTS_LIMIT } from "@/lib/config/constants";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { GET } from "./route";

const { fetchAdaptiveMock, checkRateLimitMock } = vi.hoisted(() => ({
  fetchAdaptiveMock: vi.fn(),
  checkRateLimitMock: vi.fn(),
}));

vi.mock("@/lib/utils/rateLimit", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/utils/rateLimit")>();
  checkRateLimitMock.mockImplementation(
    async (...args: Parameters<typeof actual.checkRateLimit>) =>
      actual.default(...args),
  );
  return { ...actual, checkRateLimit: checkRateLimitMock };
});

vi.mock("@/api/fetchNpmDownloadsAdaptive", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/api/fetchNpmDownloadsAdaptive")>()),
  default: fetchAdaptiveMock,
}));

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const TOLERANCE_MS = 60 * 1000;

const cannedResult = {
  data: { react: [{ date: "2025-01-01", count: 5 }] },
  errors: {},
  stats: {},
};

let ipCounter = 0;

const buildRequest = (query: string) =>
  new NextRequest(`http://localhost/api/badge?${query}`, {
    headers: { "x-real-ip": `10.1.0.${++ipCounter}` },
  });

const passedStartDate = () => {
  const startDate = fetchAdaptiveMock.mock.calls[0]?.[1]?.startDate;
  if (!startDate) throw new Error("startDate was not passed");
  return startDate;
};

const expectWeeksAgo = (date: Date, weeks: number) =>
  expect(Math.abs(Date.now() - weeks * WEEK_MS - date.getTime())).toBeLessThan(
    TOLERANCE_MS,
  );

beforeEach(() => {
  fetchAdaptiveMock.mockReset();
  fetchAdaptiveMock.mockResolvedValue(cannedResult);
});

describe("GET /api/badge", () => {
  test("defaults to 52 weeks when period is missing", async () => {
    const response = await GET(buildRequest("packages=react"));

    expect(response.status).toBe(200);
    expectWeeksAgo(passedStartDate(), 52);
  });

  test("serves complete data with the public cache header", async () => {
    const response = await GET(buildRequest("packages=react"));

    expect(response.headers.get("Cache-Control")).toContain("public");
  });

  test("does not cache a badge rendered from partial data", async () => {
    fetchAdaptiveMock.mockResolvedValue({
      ...cannedResult,
      errors: { react: 'Some download data for "react" could not be loaded' },
    });

    const response = await GET(buildRequest("packages=react"));

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });

  test("keeps caching a badge for a package that does not exist", async () => {
    fetchAdaptiveMock.mockResolvedValue({
      data: { react: cannedResult.data.react, "no-such-pkg": null },
      errors: { "no-such-pkg": 'Package "no-such-pkg" not found' },
      stats: {},
    });

    const response = await GET(buildRequest("packages=react,no-such-pkg"));

    expect(response.headers.get("Cache-Control")).toContain("public");
  });

  test("defaults to 52 weeks when period is empty", async () => {
    await GET(buildRequest("packages=react&period="));

    expectWeeksAgo(passedStartDate(), 52);
  });

  test("uses the numeric period when provided", async () => {
    await GET(buildRequest("packages=react&period=10"));

    expectWeeksAgo(passedStartDate(), 10);
  });

  test("checks the durable rate limiter with the badge key and limits", async () => {
    await GET(
      new NextRequest("http://localhost/api/badge?packages=react", {
        headers: { "x-real-ip": "8.8.8.8" },
      }),
    );

    expect(checkRateLimitMock).toHaveBeenCalledWith("badge:8.8.8.8", {
      windowMs: 60 * 1000,
      maxRequests: 20,
    });
  });

  test("returns 429 with no-store when rate limited", async () => {
    checkRateLimitMock.mockResolvedValueOnce(true);

    const response = await GET(buildRequest("packages=react"));

    expect(response.status).toBe(429);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(fetchAdaptiveMock).not.toHaveBeenCalled();
  });

  test("trims, dedupes and sorts the package list", async () => {
    await GET(buildRequest("packages=%20vue,react%20,vue,react"));

    expect(fetchAdaptiveMock.mock.calls[0]?.[0]).toEqual(["react", "vue"]);
  });

  test("returns 502 with no-store when the download fetch fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    fetchAdaptiveMock.mockRejectedValue(new Error("boom"));

    const response = await GET(buildRequest("packages=react"));

    expect(response.status).toBe(502);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await response.text()).toContain("Failed to load download data");
  });

  test("accepts legacy mixed-case package names like JSONStream", async () => {
    const response = await GET(buildRequest("packages=JSONStream"));

    expect(response.status).not.toBe(400);
    expect(fetchAdaptiveMock).toHaveBeenCalledTimes(1);
  });

  test.each([
    ["abc", 52],
    ["Infinity", 52],
    ["1", 4],
    ["-20", 4],
    ["500", 104],
    ["10.9", 10],
  ])("clamps period=%s to %i weeks", async (period, weeks) => {
    await GET(buildRequest(`packages=react&period=${period}`));

    expectWeeksAgo(passedStartDate(), weeks);
  });

  test("returns an SVG with cacheable headers on success", async () => {
    const response = await GET(buildRequest("packages=react"));

    expect(response.headers.get("Content-Type")).toBe(
      "image/svg+xml; charset=utf-8",
    );
    expect(response.headers.get("Cache-Control")).toContain("max-age=3600");
    expect(await response.text()).toContain("npm weekly downloads");
  });

  test("draws a flat line for a single data point", async () => {
    const response = await GET(buildRequest("packages=react"));

    expect(await response.text()).toMatch(/<polyline points="[^"]+ [^"]+"/);
  });

  test("draws a sparkline across several weekly buckets", async () => {
    fetchAdaptiveMock.mockResolvedValue({
      ...cannedResult,
      data: {
        react: [
          { date: "2025-01-01", count: 10 },
          { date: "2025-01-08", count: 30 },
          { date: "2025-01-15", count: 20 },
        ],
      },
    });

    const response = await GET(buildRequest("packages=react"));

    const svg = await response.text();
    expect(svg).toContain("<polyline");
    expect(svg).toContain("/ week");
  });

  test.each([
    ["null data", { "no-such-pkg": null }],
    ["empty data", { "no-such-pkg": [] }],
  ])("renders an unavailable row for %s", async (_label, data) => {
    fetchAdaptiveMock.mockResolvedValue({ data, errors: {}, stats: {} });

    const response = await GET(buildRequest("packages=no-such-pkg"));

    const svg = await response.text();
    expect(response.status).toBe(200);
    expect(svg).toContain("no data");
    expect(svg).toContain("unavailable");
  });

  test("returns 400 with no-store when no packages are provided", async () => {
    const response = await GET(buildRequest(""));

    expect(response.status).toBe(400);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await response.text()).toContain("No packages provided");
    expect(fetchAdaptiveMock).not.toHaveBeenCalled();
  });

  test("returns 400 when too many packages are requested", async () => {
    const names = Array.from(
      { length: SELECTED_PROJECTS_LIMIT + 1 },
      (_, index) => `pkg-${index}`,
    ).join(",");

    const response = await GET(buildRequest(`packages=${names}`));

    expect(response.status).toBe(400);
    expect(await response.text()).toContain(
      `Max ${SELECTED_PROJECTS_LIMIT} packages allowed`,
    );
  });

  test("returns 400 and escapes XML for invalid package names", async () => {
    const response = await GET(
      buildRequest(`packages=${encodeURIComponent("<b>&")}`),
    );

    const svg = await response.text();
    expect(response.status).toBe(400);
    expect(svg).toContain("Invalid package names: &lt;b&gt;&amp;");
    expect(svg).not.toContain("<b>");
    expect(fetchAdaptiveMock).not.toHaveBeenCalled();
  });

  test("surfaces an AppError message in the 502 SVG", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    fetchAdaptiveMock.mockRejectedValue(new AppError("registry down"));

    const response = await GET(buildRequest("packages=react"));

    expect(response.status).toBe(502);
    expect(await response.text()).toContain("registry down");
  });
});
