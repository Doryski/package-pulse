import type { APIRequestContext, APIResponse } from "@playwright/test";
import { expect, originHeader, test } from "./fixtures";

const LIMIT = 10;
const DEFAULT_WEEKS = 52;
const MIN_WEEKS = 4;
const MAX_WEEKS = 104;
const DEFAULT_COMPARISONS_LIMIT = 20;
const MAX_COMPARISONS_LIMIT = 50;
const SVG_CONTENT_TYPE = "image/svg+xml";
const BADGE_CACHE_CONTROL =
  "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400";
const DOWNLOADS_CACHE_CONTROL =
  "public, s-maxage=3600, stale-while-revalidate=86400";
const INVALID_BODY_ERROR = `Invalid request body. Projects array required (1-${LIMIT} package names).`;

const tooManyPackages = Array.from(
  { length: LIMIT + 1 },
  (_, index) => `e2e-api-many-${index}`,
);

const uniqueName = (label: string) =>
  `e2e-api-${label}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const packagesQuery = (packages: readonly string[]) =>
  encodeURIComponent(packages.join(","));

const getBadge = (api: APIRequestContext, query: string) =>
  api.get(`/api/badge?${query}`);

const sparklinePointCount = (svg: string) =>
  svg
    .match(/<polyline points="([^"]+)"/)?.[1]
    ?.trim()
    .split(/\s+/).length ?? 0;

const expectSvg = async (response: APIResponse, status: number) => {
  expect(response.status()).toBe(status);
  expect(response.headers()["content-type"]).toContain(SVG_CONTENT_TYPE);
  return response.text();
};

const getDownloads = (api: APIRequestContext, packages: readonly string[]) =>
  api.get(`/api/downloads?packages=${packagesQuery(packages)}`);

const postComparison = (
  api: APIRequestContext,
  baseURL: string | undefined,
  data: unknown,
) =>
  api.post("/api/comparisons", {
    data,
    headers: originHeader(baseURL ?? ""),
  });

type ComparisonsBody = { comparisons: unknown[]; total: number };

const listComparisons = async (api: APIRequestContext, limit: string) => {
  const response = await api.get(`/api/comparisons?limit=${limit}`);
  expect(response.status()).toBe(200);
  const body: ComparisonsBody = await response.json();
  return body.comparisons.length;
};

test.describe("GET /api/badge", () => {
  test("renders a cacheable svg for known packages", async ({ api }) => {
    const packages = ["e2e-api-badge-a", "e2e-api-badge-b"];
    const response = await getBadge(api, `packages=${packagesQuery(packages)}`);

    const svg = await expectSvg(response, 200);
    expect(response.headers()["cache-control"]).toBe(BADGE_CACHE_CONTROL);
    expect(svg).toContain("npm weekly downloads");
    for (const name of packages) expect(svg).toContain(name);
    expect(svg).toContain("/ week");
    expect(sparklinePointCount(svg)).toBe(DEFAULT_WEEKS);
  });

  test("rejects missing, too many and invalid packages", async ({ api }) => {
    const cases = [
      { query: "", message: "No packages provided" },
      {
        query: `packages=${packagesQuery(tooManyPackages)}`,
        message: `Max ${LIMIT} packages allowed`,
      },
      {
        query: `packages=${packagesQuery(["e2e-api-ok", "bad name"])}`,
        message: "Invalid package names: bad name",
      },
    ];

    for (const { query, message } of cases) {
      const response = await getBadge(api, query);
      const svg = await expectSvg(response, 400);
      expect(response.headers()["cache-control"]).toBe("no-store");
      expect(svg).toContain(message);
    }
  });

  test("renders no data for unknown packages", async ({ api }) => {
    const response = await getBadge(api, "packages=missing-e2e-api-badge");

    const svg = await expectSvg(response, 200);
    expect(svg).toContain("missing-e2e-api-badge");
    expect(svg).toContain("no data");
    expect(svg).toContain("unavailable");
  });

  test("clamps the period to the supported range", async ({ api }) => {
    const cases = [
      { period: "1", weeks: MIN_WEEKS },
      { period: "12", weeks: 12 },
      { period: "500", weeks: MAX_WEEKS },
      { period: "abc", weeks: DEFAULT_WEEKS },
    ];

    for (const { period, weeks } of cases) {
      const response = await getBadge(
        api,
        `packages=e2e-api-period&period=${period}`,
      );
      const svg = await expectSvg(response, 200);
      expect(sparklinePointCount(svg), `period=${period}`).toBe(weeks);
    }
  });
});

test.describe("GET /api/downloads", () => {
  test("rejects missing, too many and invalid packages", async ({ api }) => {
    const cases = [
      { path: "/api/downloads", error: "No packages provided." },
      {
        path: `/api/downloads?packages=${packagesQuery(tooManyPackages)}`,
        error: `A maximum of ${LIMIT} packages is allowed.`,
      },
      {
        path: `/api/downloads?packages=${packagesQuery(["e2e-api-ok", "bad name"])}`,
        error: "Invalid package names: bad name",
      },
    ];

    for (const { path, error } of cases) {
      const response = await api.get(path);
      expect(response.status(), path).toBe(400);
      expect(response.headers()["cache-control"]).toBe("no-store");
      expect(await response.json()).toEqual({ error });
    }
  });

  test("returns data, errors and stats", async ({ api }) => {
    const known = "e2e-api-downloads";
    const missing = "missing-e2e-api-downloads";
    const response = await getDownloads(api, [known, missing]);

    expect(response.status()).toBe(200);
    expect(response.headers()["cache-control"]).toBe(DOWNLOADS_CACHE_CONTROL);
    const body = await response.json();
    expect(Object.keys(body).sort()).toEqual(["data", "errors", "stats"]);
    expect(body.data[known].length).toBeGreaterThan(0);
    expect(body.data[known][0]).toEqual({
      date: expect.any(String),
      count: expect.any(Number),
    });
    expect(body.data[missing]).toBeNull();
    expect(body.errors).toEqual({});
    expect(body.stats).toEqual({
      requestCount: expect.any(Number),
      rateLimitEvents: expect.any(Number),
      totalRetries: expect.any(Number),
      maxConcurrencyReached: expect.any(Number),
      finalConcurrency: expect.any(Number),
    });
    expect(body.stats.requestCount).toBeGreaterThan(0);
  });

  test("reports a not found error for a single unknown package", async ({
    api,
  }) => {
    const missing = "missing-e2e-api-single";
    const response = await getDownloads(api, [missing]);

    expect(response.status()).toBe(200);
    expect(response.headers()["cache-control"]).toBe(DOWNLOADS_CACHE_CONTROL);
    expect(await response.json()).toMatchObject({
      data: { [missing]: null },
      errors: { [missing]: `Package "${missing}" not found` },
    });
  });
});

test.describe("/api/comparisons", () => {
  test("rejects cross-origin and origin-less posts", async ({ api }) => {
    const data = { projects: [uniqueName("cors")] };
    const responses = [
      await api.post("/api/comparisons", {
        data,
        headers: { Origin: "https://evil.example" },
      }),
      await api.post("/api/comparisons", { data }),
    ];

    for (const response of responses) {
      expect(response.status()).toBe(403);
      expect(await response.json()).toEqual({
        error: "Cross-origin requests are not allowed.",
      });
    }
  });

  test("rejects invalid bodies", async ({ api, baseURL }) => {
    const bodies = [
      {},
      { projects: [] },
      { projects: "react" },
      { projects: tooManyPackages },
    ];

    for (const body of bodies) {
      const response = await postComparison(api, baseURL, body);
      expect(response.status(), JSON.stringify(body)).toBe(400);
      expect(await response.json()).toEqual({ error: INVALID_BODY_ERROR });
    }
  });

  test("rejects comparisons without existing packages", async ({
    api,
    baseURL,
  }) => {
    const missing = `missing-${uniqueName("none")}`;
    const response = await postComparison(api, baseURL, {
      projects: [missing, "bad name"],
    });

    expect(response.status()).toBe(400);
    expect(await response.json()).toEqual({
      error: `No valid packages found. Invalid packages: ${missing}, bad name`,
    });
  });

  test("creates a comparison and rejects its duplicate", async ({
    api,
    baseURL,
  }) => {
    const projects = [uniqueName("first"), uniqueName("second")];

    const created = await postComparison(api, baseURL, { projects });
    expect(created.status()).toBe(201);
    const body = await created.json();
    expect(body).toEqual({
      id: expect.any(String),
      timestamp: expect.any(Number),
      projects,
    });

    const duplicate = await postComparison(api, baseURL, {
      projects: projects.toReversed(),
    });
    expect(duplicate.status()).toBe(409);
    expect(await duplicate.json()).toEqual({
      error: "Duplicate comparison detected.",
    });
  });

  test("reports filtered packages on partial validation", async ({
    api,
    baseURL,
  }) => {
    const valid = uniqueName("valid");
    const missing = `missing-${uniqueName("filtered")}`;

    const response = await postComparison(api, baseURL, {
      projects: [valid, missing],
    });

    expect(response.status()).toBe(201);
    expect(await response.json()).toMatchObject({
      projects: [valid],
      validation: {
        invalidPackages: [missing],
        message: "1 valid packages stored. 1 packages filtered out.",
      },
    });
  });

  test("coerces the limit parameter", async ({ api, baseURL }) => {
    const created = await postComparison(api, baseURL, {
      projects: [uniqueName("limit")],
    });
    expect(created.status()).toBe(201);

    expect(await listComparisons(api, "1")).toBe(1);

    await expect(async () => {
      const [fallback, zero, huge, max] = await Promise.all(
        ["abc", "0", "999", String(MAX_COMPARISONS_LIMIT)].map((limit) =>
          listComparisons(api, limit),
        ),
      );
      const expectedFallback = Math.min(DEFAULT_COMPARISONS_LIMIT, max ?? 0);
      expect(fallback).toBe(expectedFallback);
      expect(zero).toBe(expectedFallback);
      expect(huge).toBe(expectedFallback);
      expect(max).toBeLessThanOrEqual(MAX_COMPARISONS_LIMIT);
    }).toPass({ timeout: 15_000 });
  });

  test("hides client metadata in the public list", async ({ api }) => {
    const response = await api.get("/api/comparisons");

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toEqual({
      comparisons: expect.any(Array),
      total: expect.any(Number),
    });
    for (const comparison of body.comparisons) {
      expect(comparison).not.toHaveProperty("clientIP");
      expect(comparison).not.toHaveProperty("userAgent");
    }
  });
});

test.describe("GET /api/comparisons/popular", () => {
  test("returns popular comparisons shape", async ({ api, baseURL }) => {
    const projects = [uniqueName("popular")];
    const created = await postComparison(api, baseURL, { projects });
    expect(created.status()).toBe(201);

    const response = await api.get("/api/comparisons/popular?limit=50");

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.total).toBe(body.comparisons.length);
    expect(body.comparisons.length).toBeLessThanOrEqual(MAX_COMPARISONS_LIMIT);
    for (const comparison of body.comparisons) {
      expect(comparison).toEqual({
        projects: expect.any(Array),
        count: expect.any(Number),
        lastUsed: expect.any(Number),
        averageProjectsCount: expect.any(Number),
      });
    }

    const limited = await api.get("/api/comparisons/popular?limit=1");
    expect((await limited.json()).comparisons).toHaveLength(1);
  });
});
