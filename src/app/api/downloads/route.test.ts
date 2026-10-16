/**
 * @vitest-environment node
 */
import type { AdaptiveDownloadsResult } from "@/api/fetchNpmDownloadsAdaptive";
import { SELECTED_PROJECTS_LIMIT } from "@/lib/config/constants";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { GET } from "./route";

const { fetchAdaptiveMock, checkRateLimitMock } = vi.hoisted(() => ({
  fetchAdaptiveMock: vi.fn(),
  checkRateLimitMock: vi.fn(),
}));

vi.mock("@/api/fetchNpmDownloadsAdaptive", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/api/fetchNpmDownloadsAdaptive")>()),
  default: fetchAdaptiveMock,
}));

vi.mock("@/lib/utils/rateLimit", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/utils/rateLimit")>();
  checkRateLimitMock.mockImplementation(
    async (...args: Parameters<typeof actual.checkRateLimit>) =>
      actual.default(...args),
  );
  return { ...actual, checkRateLimit: checkRateLimitMock };
});

const MAX_REQUESTS_PER_WINDOW = 20;

const cannedResult: AdaptiveDownloadsResult = {
  data: { react: [{ date: "2025-01-01", count: 5 }] },
  errors: {},
  stats: {
    requestCount: 1,
    rateLimitEvents: 0,
    totalRetries: 0,
    maxConcurrencyReached: 1,
    finalConcurrency: 1,
  },
};

let ipCounter = 0;

const uniqueIp = () => `10.0.0.${++ipCounter}`;

const buildRequest = ({
  packages,
  headers,
}: {
  packages?: string[];
  headers?: Record<string, string>;
}) => {
  const query =
    packages === undefined
      ? ""
      : `?packages=${encodeURIComponent(packages.join(","))}`;
  return new NextRequest(`http://localhost/api/downloads${query}`, {
    headers: { "x-real-ip": uniqueIp(), ...headers },
  });
};

beforeEach(() => {
  fetchAdaptiveMock.mockReset();
  fetchAdaptiveMock.mockResolvedValue(cannedResult);
});

describe("GET /api/downloads", () => {
  test("returns 200 with { data, errors, stats } for valid packages", async () => {
    const packages = ["react", "vue", "@angular/core"];
    const response = await GET(buildRequest({ packages }));

    expect(response.status).toBe(200);
    expect(fetchAdaptiveMock).toHaveBeenCalledTimes(1);
    expect(fetchAdaptiveMock).toHaveBeenCalledWith(packages.toSorted());
    await expect(response.json()).resolves.toEqual(cannedResult);
  });

  test("checks the durable rate limiter with the downloads key and limits", async () => {
    await GET(
      buildRequest({
        packages: ["react"],
        headers: { "x-real-ip": "7.7.7.7" },
      }),
    );

    expect(checkRateLimitMock).toHaveBeenCalledWith("downloads:7.7.7.7", {
      windowMs: 60 * 1000,
      maxRequests: MAX_REQUESTS_PER_WINDOW,
    });
  });

  test("trims, dedupes and sorts the package list", async () => {
    const response = await GET(
      buildRequest({ packages: [" vue", "react ", "vue", "react", "@a/b"] }),
    );

    expect(response.status).toBe(200);
    expect(fetchAdaptiveMock).toHaveBeenCalledWith(["@a/b", "react", "vue"]);
  });

  test("counts unique packages against SELECTED_PROJECTS_LIMIT", async () => {
    const packages = Array.from(
      { length: SELECTED_PROJECTS_LIMIT + 1 },
      () => "react",
    );
    const response = await GET(buildRequest({ packages }));

    expect(response.status).toBe(200);
    expect(fetchAdaptiveMock).toHaveBeenCalledWith(["react"]);
  });

  test("serves complete data with a public CDN cache header", async () => {
    const response = await GET(buildRequest({ packages: ["react"] }));

    expect(response.headers.get("Cache-Control")).toBe(
      "public, s-maxage=3600, stale-while-revalidate=86400",
    );
  });

  test("does not cache a response with transient package errors", async () => {
    fetchAdaptiveMock.mockResolvedValue({
      ...cannedResult,
      errors: { react: 'Some download data for "react" could not be loaded' },
    });

    const response = await GET(buildRequest({ packages: ["react"] }));

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });

  test("keeps caching when the only error is a missing package", async () => {
    fetchAdaptiveMock.mockResolvedValue({
      ...cannedResult,
      errors: { "no-such-pkg": 'Package "no-such-pkg" not found' },
    });

    const response = await GET(
      buildRequest({ packages: ["react", "no-such-pkg"] }),
    );

    expect(response.headers.get("Cache-Control")).toContain("public");
  });

  test("returns a generic 500 with no-store when the fetch throws", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    fetchAdaptiveMock.mockRejectedValue(new Error("secret internal detail"));

    const response = await GET(buildRequest({ packages: ["react"] }));

    expect(response.status).toBe(500);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    await expect(response.json()).resolves.toEqual({
      error: "Failed to fetch NPM download data",
    });
  });

  test("returns no-store on validation errors", async () => {
    const response = await GET(buildRequest({}));

    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });

  test("accepts exactly SELECTED_PROJECTS_LIMIT packages", async () => {
    const packages = Array.from(
      { length: SELECTED_PROJECTS_LIMIT },
      (_, index) => `pkg-${index}`,
    );
    const response = await GET(buildRequest({ packages }));

    expect(response.status).toBe(200);
    expect(fetchAdaptiveMock).toHaveBeenCalledWith(packages.toSorted());
  });

  test("rejects an invalid package name with 400", async () => {
    const response = await GET(
      buildRequest({ packages: ["react", "Invalid Name!"] }),
    );

    expect(response.status).toBe(400);
    expect(fetchAdaptiveMock).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toEqual({
      error: "Invalid package names: Invalid Name!",
    });
  });

  test("accepts legacy mixed-case package names like JSONStream", async () => {
    const response = await GET(buildRequest({ packages: ["JSONStream"] }));

    expect(response.status).toBe(200);
    expect(fetchAdaptiveMock).toHaveBeenCalledWith(["JSONStream"]);
  });

  test("accepts valid lowercase, scoped, and punctuated names", async () => {
    const packages = [
      "react",
      "@angular/core",
      "lodash.debounce",
      "my-pkg_name",
    ];
    const response = await GET(buildRequest({ packages }));

    expect(response.status).toBe(200);
    expect(fetchAdaptiveMock).toHaveBeenCalledWith(packages.toSorted());
  });

  test("rejects empty packages with 400", async () => {
    const response = await GET(buildRequest({}));

    expect(response.status).toBe(400);
    expect(fetchAdaptiveMock).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toEqual({
      error: "No packages provided.",
    });
  });

  test("rejects more than SELECTED_PROJECTS_LIMIT packages with 400", async () => {
    const packages = Array.from(
      { length: SELECTED_PROJECTS_LIMIT + 1 },
      (_, index) => `pkg-${index}`,
    );
    const response = await GET(buildRequest({ packages }));

    expect(response.status).toBe(400);
    expect(fetchAdaptiveMock).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toEqual({
      error: `A maximum of ${SELECTED_PROJECTS_LIMIT} packages is allowed.`,
    });
  });

  test("rate limits the (limit+1)th request from the same client IP", async () => {
    const ip = uniqueIp();

    for (let index = 0; index < MAX_REQUESTS_PER_WINDOW; index++) {
      const response = await GET(
        buildRequest({ packages: ["react"], headers: { "x-real-ip": ip } }),
      );
      expect(response.status).toBe(200);
    }

    const limited = await GET(
      buildRequest({ packages: ["react"], headers: { "x-real-ip": ip } }),
    );

    expect(limited.status).toBe(429);
    await expect(limited.json()).resolves.toEqual({
      error: "Rate limit exceeded. Too many requests.",
    });
  });

  test("a different client IP is not rate limited (fresh bucket)", async () => {
    const exhaustedIp = uniqueIp();

    for (let index = 0; index <= MAX_REQUESTS_PER_WINDOW; index++) {
      await GET(
        buildRequest({
          packages: ["react"],
          headers: { "x-real-ip": exhaustedIp },
        }),
      );
    }

    const fresh = await GET(
      buildRequest({
        packages: ["react"],
        headers: { "x-real-ip": uniqueIp() },
      }),
    );

    expect(fresh.status).toBe(200);
  });

  test("a spoofed leftmost x-forwarded-for does not escape the bucket keyed by x-real-ip", async () => {
    const ip = uniqueIp();

    for (let index = 0; index < MAX_REQUESTS_PER_WINDOW; index++) {
      const response = await GET(
        buildRequest({
          packages: ["react"],
          headers: {
            "x-real-ip": ip,
            "x-forwarded-for": `1.2.3.${index}, 9.9.9.9`,
          },
        }),
      );
      expect(response.status).toBe(200);
    }

    const limited = await GET(
      buildRequest({
        packages: ["react"],
        headers: {
          "x-real-ip": ip,
          "x-forwarded-for": "5.5.5.5, 9.9.9.9",
        },
      }),
    );

    expect(limited.status).toBe(429);
  });
});
