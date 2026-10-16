/**
 * @vitest-environment node
 */
import { beforeEach, describe, expect, test, vi } from "vitest";
import { GET, maxDuration, runtime } from "./route";

const { getDepsDevInfoMock, checkRateLimitMock } = vi.hoisted(() => ({
  getDepsDevInfoMock: vi.fn(),
  checkRateLimitMock: vi.fn(),
}));

vi.mock("@/lib/server/depsDev", () => ({
  getDepsDevInfo: getDepsDevInfoMock,
}));

vi.mock("@/lib/utils/rateLimit", () => ({
  checkRateLimit: checkRateLimitMock,
}));

const SUCCESS_CACHE_CONTROL =
  "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400";

const info = {
  version: "1.0.0",
  vulnerabilityCount: 0,
  licenses: ["MIT"],
  healthScore: 7.5,
  starsCount: 10,
  forksCount: 2,
  openIssuesCount: 3,
  projectId: "github.com/o/r",
};

const request = (packages: string) =>
  new Request(
    `http://localhost/api/deps-dev?packages=${encodeURIComponent(packages)}`,
    { headers: { "x-real-ip": "198.51.100.5" } },
  );

beforeEach(() => {
  getDepsDevInfoMock.mockReset();
  checkRateLimitMock.mockReset();
  checkRateLimitMock.mockResolvedValue(false);
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

describe("GET /api/deps-dev", () => {
  test("runs on node with a 30 s budget", () => {
    expect(runtime).toBe("nodejs");
    expect(maxDuration).toBe(30);
  });

  test("returns deps.dev data with the success header", async () => {
    getDepsDevInfoMock.mockResolvedValue({ data: { react: info }, errors: {} });

    const response = await GET(request("vue,react"));

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe(SUCCESS_CACHE_CONTROL);
    await expect(response.json()).resolves.toEqual({
      data: { react: info },
      errors: {},
    });
    expect(getDepsDevInfoMock).toHaveBeenCalledWith(["react", "vue"]);
    expect(checkRateLimitMock).toHaveBeenCalledWith(
      "deps-dev:198.51.100.5",
      expect.objectContaining({ maxRequests: 20 }),
    );
  });

  test("is no-store when a package failed upstream", async () => {
    getDepsDevInfoMock.mockResolvedValue({
      data: { react: null },
      errors: { react: "upstream" },
    });
    const response = await GET(request("react"));
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });

  test("rejects versioned entries", async () => {
    const response = await GET(request("react@18.2.0"));
    expect(response.status).toBe(400);
    expect(getDepsDevInfoMock).not.toHaveBeenCalled();
  });

  test("returns 500 no-store when loading throws", async () => {
    getDepsDevInfoMock.mockRejectedValue(new Error("boom"));
    const response = await GET(request("react"));
    expect(response.status).toBe(500);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    await expect(response.json()).resolves.toEqual({
      error: "Failed to fetch deps.dev data",
    });
  });
});
