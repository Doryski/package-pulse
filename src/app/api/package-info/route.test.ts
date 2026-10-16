/**
 * @vitest-environment node
 */
import AppError from "@/lib/utils/AppError";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { GET, maxDuration, runtime } from "./route";

const { fetchPackumentMock, checkRateLimitMock } = vi.hoisted(() => ({
  fetchPackumentMock: vi.fn(),
  checkRateLimitMock: vi.fn(),
}));

vi.mock("next/cache", () => ({ unstable_cache: (fn: unknown) => fn }));

vi.mock("@/lib/server/npmRegistry", () => ({
  fetchPackument: fetchPackumentMock,
}));

vi.mock("@/lib/utils/rateLimit", () => ({
  checkRateLimit: checkRateLimitMock,
}));

const SUCCESS_CACHE_CONTROL =
  "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400";
const B5_VERSIONS = 1_000;
const B5_MAX_BYTES_PER_PACKAGE = 30 * 1024;
const DAY_MS = 86_400_000;

let ipCounter = 0;

const buildRequest = (packages: string, init: RequestInit = {}) =>
  new Request(
    `http://localhost/api/package-info?packages=${encodeURIComponent(packages)}`,
    { headers: { "x-real-ip": `10.1.0.${++ipCounter}` }, ...init },
  );

const buildPackument = (name: string) => ({
  name,
  description: `Package ${name}`,
  homepage: `https://example.com/${name}`,
  license: "MIT",
  repository: { type: "git", url: `git+https://github.com/owner/${name}.git` },
  users: { alice: true },
  "dist-tags": { latest: "1.1.0" },
  versions: { "1.0.0": {}, "1.1.0": { dependencies: { a: "1" } } },
  time: {
    created: "2020-01-01T00:00:00.000Z",
    modified: "2021-01-01T00:00:00.000Z",
    "1.0.0": "2020-01-01T00:00:00.000Z",
    "1.1.0": "2021-01-01T00:00:00.000Z",
  },
});

const toVersion = (index: number) =>
  `${Math.floor(index / 100)}.${Math.floor(index / 10) % 10}.${index % 10}`;

const buildVersionDoc = (name: string, version: string) => ({
  name,
  version,
  description: `Package ${name}`.repeat(4),
  dependencies: Object.fromEntries(
    Array.from({ length: 12 }, (_, dep) => [`dep-${dep}`, `^${version}`]),
  ),
  devDependencies: Object.fromEntries(
    Array.from({ length: 30 }, (_, dep) => [`dev-${dep}`, `^${version}`]),
  ),
  dist: {
    shasum: "a".repeat(40),
    tarball: `https://registry.npmjs.org/${name}/-/${name}-${version}.tgz`,
    integrity: `sha512-${"b".repeat(86)}`,
  },
});

const buildLargePackument = (name: string) => {
  const versions = Array.from({ length: B5_VERSIONS }, (_, index) => ({
    version: toVersion(index),
    date: new Date(Date.UTC(2016, 0, 1) + index * DAY_MS).toISOString(),
  }));
  return {
    ...buildPackument(name),
    "dist-tags": { latest: versions.at(-1)?.version },
    versions: Object.fromEntries(
      versions.map(({ version }) => [version, buildVersionDoc(name, version)]),
    ),
    time: {
      created: versions[0]?.date,
      modified: versions.at(-1)?.date,
      ...Object.fromEntries(
        versions.map(({ version, date }) => [version, date]),
      ),
    },
    users: Object.fromEntries(
      Array.from({ length: 500 }, (_, user) => [`user-${user}`, true]),
    ),
    readme: "x".repeat(200_000),
  };
};

const resolvePackument = (name: string) =>
  Promise.resolve(buildPackument(name));

beforeEach(() => {
  fetchPackumentMock.mockReset();
  fetchPackumentMock.mockImplementation(resolvePackument);
  checkRateLimitMock.mockReset();
  checkRateLimitMock.mockResolvedValue(false);
});

describe("GET /api/package-info", () => {
  test("exports the node runtime and a 30 s max duration", () => {
    expect(runtime).toBe("nodejs");
    expect(maxDuration).toBe(30);
  });

  test("returns trimmed info per package with the success cache header", async () => {
    const response = await GET(buildRequest("vue,react,react"));

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe(SUCCESS_CACHE_CONTROL);
    const body = await response.json();
    expect(Object.keys(body.data)).toEqual(["react", "vue"]);
    expect(body.errors).toEqual({});
    expect(body.data.react).toEqual({
      projectName: "react",
      repoName: "owner/react",
      repositoryUrl: "git+https://github.com/owner/react.git",
      homepage: "https://example.com/react",
      description: "Package react",
      license: "MIT",
      createdAt: "2020-01-01T00:00:00.000Z",
      lastReleaseDate: "2021-01-01T00:00:00.000Z",
      latestVersion: "1.1.0",
      dependenciesCount: 1,
      devDependenciesCount: null,
      contributorsCount: 1,
      latestRelease: { version: "1.1.0", date: "2021-01-01T00:00:00.000Z" },
    });
  });

  test("keys the rate limit by route and client ip", async () => {
    await GET(buildRequest("react"));

    expect(checkRateLimitMock).toHaveBeenCalledWith(
      expect.stringMatching(/^package-info:10\.1\.0\.\d+$/),
      { windowMs: 60_000, maxRequests: 20 },
    );
  });

  test("returns 429 with no-store when rate limited", async () => {
    checkRateLimitMock.mockResolvedValue(true);

    const response = await GET(buildRequest("react"));

    expect(response.status).toBe(429);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(fetchPackumentMock).not.toHaveBeenCalled();
  });

  test.each([
    [""],
    ["Invalid Name!"],
    [Array.from({ length: 11 }, (_, i) => `p${i}`).join(",")],
  ])("returns 400 for invalid package lists %#", async (packages) => {
    const response = await GET(buildRequest(packages));

    expect(response.status).toBe(400);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    await expect(response.json()).resolves.toEqual({
      error: expect.any(String),
    });
  });

  test("reports 404 packages as notFound and keeps the success cache header", async () => {
    fetchPackumentMock.mockImplementation((name: string) =>
      name === "missing-pkg" ? Promise.resolve(null) : resolvePackument(name),
    );

    const response = await GET(buildRequest("react,missing-pkg"));

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe(SUCCESS_CACHE_CONTROL);
    const body = await response.json();
    expect(body.data["missing-pkg"]).toBeNull();
    expect(body.errors).toEqual({ "missing-pkg": "notFound" });
  });

  test("reports transient failures as upstream with no-store", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    fetchPackumentMock.mockImplementation((name: string) =>
      name === "vue"
        ? Promise.reject(new AppError("boom", { status: 502 }))
        : resolvePackument(name),
    );

    const response = await GET(buildRequest("react,vue"));

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    const body = await response.json();
    expect(body.data.vue).toBeNull();
    expect(body.data.react).not.toBeNull();
    expect(body.errors).toEqual({ vue: "upstream" });
  });

  test("returns upstream errors for every package with no-store when all fail", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    fetchPackumentMock.mockRejectedValue(new AppError("boom", { status: 502 }));

    const response = await GET(buildRequest("react,vue"));

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    await expect(response.json()).resolves.toEqual({
      data: { react: null, vue: null },
      errors: { react: "upstream", vue: "upstream" },
    });
  });

  test("fetches at most two packuments at a time", async () => {
    let active = 0;
    let peak = 0;
    fetchPackumentMock.mockImplementation(async (name: string) => {
      active += 1;
      peak = Math.max(peak, active);
      await new Promise((resolve) => setTimeout(resolve, 5));
      active -= 1;
      return buildPackument(name);
    });

    const response = await GET(buildRequest("a,b,c,d,e"));

    expect(response.status).toBe(200);
    expect(fetchPackumentMock).toHaveBeenCalledTimes(5);
    expect(peak).toBe(2);
  });

  test("B5: a next-sized packument yields at most 30 KB per package", async () => {
    fetchPackumentMock.mockImplementation((name: string) =>
      Promise.resolve(buildLargePackument(name)),
    );
    const packages = ["next", "typescript"];

    const response = await GET(buildRequest(packages.join(",")));
    const raw = await response.text();
    const body = JSON.parse(raw);

    expect(response.status).toBe(200);
    expect(JSON.stringify(buildLargePackument("next")).length).toBeGreaterThan(
      B5_MAX_BYTES_PER_PACKAGE * packages.length,
    );
    expect(new TextEncoder().encode(raw).byteLength).toBeLessThanOrEqual(
      B5_MAX_BYTES_PER_PACKAGE * packages.length,
    );
    expect(body.data.next).toMatchObject({
      latestVersion: "9.9.9",
      dependenciesCount: 12,
      devDependenciesCount: 30,
      contributorsCount: 500,
      latestRelease: { version: "9.9.9" },
    });
    expect(body.data.next).not.toHaveProperty("versions");
  });
});
