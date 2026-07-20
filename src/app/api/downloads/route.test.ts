/**
 * @vitest-environment node
 */
import type { AdaptiveDownloadsResult } from "@/api/fetchNpmDownloadsAdaptive";
import { SELECTED_PROJECTS_LIMIT } from "@/lib/config/constants";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { GET } from "./route";

const { fetchAdaptiveMock } = vi.hoisted(() => ({
  fetchAdaptiveMock: vi.fn(),
}));

vi.mock("@/api/fetchNpmDownloadsAdaptive", () => ({
  default: fetchAdaptiveMock,
}));

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
    expect(fetchAdaptiveMock).toHaveBeenCalledWith(packages);
    await expect(response.json()).resolves.toEqual(cannedResult);
  });

  test("accepts exactly SELECTED_PROJECTS_LIMIT packages", async () => {
    const packages = Array.from(
      { length: SELECTED_PROJECTS_LIMIT },
      (_, index) => `pkg-${index}`,
    );
    const response = await GET(buildRequest({ packages }));

    expect(response.status).toBe(200);
    expect(fetchAdaptiveMock).toHaveBeenCalledWith(packages);
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

  test("rejects a non-lowercase package name with 400", async () => {
    const response = await GET(buildRequest({ packages: ["React"] }));

    expect(response.status).toBe(400);
    expect(fetchAdaptiveMock).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toEqual({
      error: "Invalid package names: React",
    });
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
    expect(fetchAdaptiveMock).toHaveBeenCalledWith(packages);
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
