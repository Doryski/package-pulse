/**
 * @vitest-environment node
 */
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { GET } from "./route";

const { fetchAdaptiveMock } = vi.hoisted(() => ({
  fetchAdaptiveMock: vi.fn(),
}));

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

  test("returns 502 with no-store when the download fetch fails", async () => {
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
});
