/**
 * @vitest-environment node
 */
import type { AdaptiveDownloadsResult } from "@/api/fetchNpmDownloadsAdaptive";
import AppError from "@/lib/utils/AppError";
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
const SUCCESS_CACHE_CONTROL =
  "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400";
const SIGNAL_OPTS = { signal: expect.any(AbortSignal) };
const B6_PACKAGES = 10;
const B6_DAYS = 4_300;
const B6_MAX_BYTES = 400 * 1024;

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

const buildQuery = (packages?: string[], version?: string) => {
  const params = [
    ...(packages === undefined
      ? []
      : [`packages=${encodeURIComponent(packages.join(","))}`]),
    ...(version === undefined ? [] : [`v=${encodeURIComponent(version)}`]),
  ];
  return params.length === 0 ? "" : `?${params.join("&")}`;
};

const buildRequest = ({
  packages,
  headers,
  version,
}: {
  packages?: string[];
  headers?: Record<string, string>;
  version?: string;
}) =>
  new NextRequest(
    `http://localhost/api/downloads${buildQuery(packages, version)}`,
    { headers: { "x-real-ip": uniqueIp(), ...headers } },
  );

const DAY_MS = 86_400_000;

const buildFullHistory = (seed: number) =>
  Array.from({ length: B6_DAYS }, (_, day) => ({
    date: new Date(Date.UTC(2015, 0, 10) + day * DAY_MS)
      .toISOString()
      .slice(0, 10),
    count: 1_000_000 + ((day * 7_919 + seed * 104_729) % 9_000_000),
  }));

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
    expect(fetchAdaptiveMock).toHaveBeenCalledWith(
      packages.toSorted(),
      SIGNAL_OPTS,
    );
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
    expect(fetchAdaptiveMock).toHaveBeenCalledWith(
      ["@a/b", "react", "vue"],
      SIGNAL_OPTS,
    );
  });

  test("counts unique packages against SELECTED_PROJECTS_LIMIT", async () => {
    const packages = Array.from(
      { length: SELECTED_PROJECTS_LIMIT + 1 },
      () => "react",
    );
    const response = await GET(buildRequest({ packages }));

    expect(response.status).toBe(200);
    expect(fetchAdaptiveMock).toHaveBeenCalledWith(["react"], SIGNAL_OPTS);
  });

  test("serves complete data with a public CDN cache header", async () => {
    const response = await GET(buildRequest({ packages: ["react"] }));

    expect(response.headers.get("Cache-Control")).toBe(SUCCESS_CACHE_CONTROL);
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
    expect(fetchAdaptiveMock).toHaveBeenCalledWith(
      packages.toSorted(),
      SIGNAL_OPTS,
    );
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
    expect(fetchAdaptiveMock).toHaveBeenCalledWith(["JSONStream"], SIGNAL_OPTS);
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
    expect(fetchAdaptiveMock).toHaveBeenCalledWith(
      packages.toSorted(),
      SIGNAL_OPTS,
    );
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

  test("returns 500 with the AppError message when the fetch fails with one", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    fetchAdaptiveMock.mockRejectedValue(new AppError("upstream exploded"));

    const response = await GET(buildRequest({ packages: ["react"] }));

    expect(response.status).toBe(500);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    await expect(response.json()).resolves.toEqual({
      error: "upstream exploded",
    });
  });
  test("exports a 30 second max duration", async () => {
    const route = await import("./route");

    expect(route.maxDuration).toBe(30);
  });

  test("passes a signal that aborts with the incoming request", async () => {
    const controller = new AbortController();
    const request = new NextRequest(
      "http://localhost/api/downloads?packages=react",
      { headers: { "x-real-ip": uniqueIp() }, signal: controller.signal },
    );
    await GET(request);
    const signal: AbortSignal = fetchAdaptiveMock.mock.calls[0]![1].signal;

    expect(signal.aborted).toBe(false);
    controller.abort();
    expect(signal.aborted).toBe(true);
  });

  test("returns 504 with no-store when the upstream fetch times out", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const timeoutSpy = vi
      .spyOn(AbortSignal, "timeout")
      .mockReturnValue(
        AbortSignal.abort(new DOMException("timed out", "TimeoutError")),
      );
    fetchAdaptiveMock.mockImplementation(
      async (_packages: string[], opts: { signal: AbortSignal }) => {
        throw opts.signal.reason;
      },
    );

    const response = await GET(buildRequest({ packages: ["react"] }));
    const timeoutCalls = timeoutSpy.mock.calls;
    timeoutSpy.mockRestore();

    expect(timeoutCalls).toEqual([[25_000]]);
    expect(response.status).toBe(504);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    await expect(response.json()).resolves.toEqual({
      error: "Timed out fetching NPM download data",
    });
  });
});

describe("GET /api/downloads?v=2", () => {
  test("returns compact series without stats", async () => {
    fetchAdaptiveMock.mockResolvedValue({
      ...cannedResult,
      data: {
        react: [
          { date: "2025-01-01", count: 5 },
          { date: "2025-01-03", count: 7 },
        ],
        "no-such-pkg": null,
      },
      errors: { "no-such-pkg": 'Package "no-such-pkg" not found' },
    });

    const response = await GET(
      buildRequest({ packages: ["react", "no-such-pkg"], version: "2" }),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe(SUCCESS_CACHE_CONTROL);
    await expect(response.json()).resolves.toEqual({
      data: {
        react: { start: "2025-01-01", counts: [5, null, 7] },
        "no-such-pkg": null,
      },
      errors: { "no-such-pkg": 'Package "no-such-pkg" not found' },
    });
  });

  test("does not cache a compact response with transient errors", async () => {
    fetchAdaptiveMock.mockResolvedValue({
      ...cannedResult,
      errors: { react: 'Some download data for "react" could not be loaded' },
    });

    const response = await GET(
      buildRequest({ packages: ["react"], version: "2" }),
    );

    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });

  test.each(["1", "3", ""])(
    "rejects unsupported version %j with 400",
    async (version) => {
      const response = await GET(
        buildRequest({ packages: ["react"], version }),
      );

      expect(response.status).toBe(400);
      expect(response.headers.get("Cache-Control")).toBe("no-store");
      expect(fetchAdaptiveMock).not.toHaveBeenCalled();
      await expect(response.json()).resolves.toEqual({
        error: "Unsupported API version.",
      });
    },
  );

  test("keeps the full-history payload for the package limit within 400 KB", async () => {
    const packages = Array.from(
      { length: B6_PACKAGES },
      (_, index) => `pkg-${index}`,
    );
    fetchAdaptiveMock.mockResolvedValue({
      ...cannedResult,
      data: Object.fromEntries(
        packages.map((name, index) => [name, buildFullHistory(index)]),
      ),
    });

    const response = await GET(buildRequest({ packages, version: "2" }));
    const bytes = new TextEncoder().encode(await response.text()).byteLength;

    expect(response.status).toBe(200);
    expect(bytes).toBeLessThanOrEqual(B6_MAX_BYTES);
  });
});
