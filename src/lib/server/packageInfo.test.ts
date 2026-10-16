/**
 * @vitest-environment node
 */
import AppError from "@/lib/utils/AppError";
import { beforeEach, describe, expect, test, vi } from "vitest";
import {
  getLatestStableRelease,
  getPackageInfo,
  PACKAGE_INFO_REVALIDATE_SECONDS,
  toPackageInfo,
} from "./packageInfo";

const { unstableCacheMock, fetchPackumentMock } = vi.hoisted(() => ({
  unstableCacheMock: vi.fn(),
  fetchPackumentMock: vi.fn(),
}));

vi.mock("next/cache", () => ({ unstable_cache: unstableCacheMock }));

vi.mock("@/lib/server/npmRegistry", () => ({
  fetchPackument: fetchPackumentMock,
}));

const buildPackument = (overrides: Record<string, unknown> = {}) => ({
  name: "pkg",
  description: "A package",
  homepage: "https://example.com/pkg",
  license: "MIT",
  repository: { type: "git", url: "git+https://github.com/owner/pkg.git" },
  users: { alice: true, bob: true, carol: true },
  "dist-tags": { latest: "2.0.0", next: "3.0.0-beta.1" },
  versions: {
    "1.0.0": { dependencies: { a: "1" } },
    "2.0.0": {
      dependencies: { a: "1", b: "2" },
      devDependencies: { c: "3" },
    },
    "1.5.0": {},
    "3.0.0-beta.1": {},
  },
  time: {
    created: "2020-01-01T00:00:00.000Z",
    modified: "2024-06-01T00:00:00.000Z",
    "1.0.0": "2020-01-01T00:00:00.000Z",
    "2.0.0": "2023-01-01T00:00:00.000Z",
    "1.5.0": "2023-06-01T00:00:00.000Z",
    "3.0.0-beta.1": "2024-05-01T00:00:00.000Z",
    "9.9.9": "2024-05-02T00:00:00.000Z",
  },
  ...overrides,
});

beforeEach(() => {
  unstableCacheMock.mockReset();
  unstableCacheMock.mockImplementation((fn: unknown) => fn);
  fetchPackumentMock.mockReset();
});

describe("toPackageInfo", () => {
  test("derives the trimmed package info from a packument", () => {
    expect(toPackageInfo("pkg", buildPackument())).toEqual({
      projectName: "pkg",
      repoName: "owner/pkg",
      repositoryUrl: "git+https://github.com/owner/pkg.git",
      homepage: "https://example.com/pkg",
      description: "A package",
      license: "MIT",
      createdAt: "2020-01-01T00:00:00.000Z",
      lastReleaseDate: "2024-06-01T00:00:00.000Z",
      latestVersion: "2.0.0",
      dependenciesCount: 2,
      devDependenciesCount: 1,
      contributorsCount: 3,
      latestRelease: { version: "1.5.0", date: "2023-06-01T00:00:00.000Z" },
    });
  });

  test("falls back to nulls for a sparse packument", () => {
    expect(toPackageInfo("bare", { name: "bare" })).toEqual({
      projectName: "bare",
      repoName: null,
      repositoryUrl: null,
      homepage: null,
      description: null,
      license: null,
      createdAt: null,
      lastReleaseDate: null,
      latestVersion: null,
      dependenciesCount: null,
      devDependenciesCount: null,
      contributorsCount: 0,
      latestRelease: null,
    });
  });

  test("reads string repositories and non-GitHub hosts", () => {
    expect(
      toPackageInfo("pkg", buildPackument({ repository: "github:o/r" })),
    ).toMatchObject({ repositoryUrl: "github:o/r", repoName: "o/r" });
    expect(
      toPackageInfo(
        "pkg",
        buildPackument({ repository: "https://gitlab.com/o/r" }),
      ),
    ).toMatchObject({
      repositoryUrl: "https://gitlab.com/o/r",
      repoName: null,
    });
  });

  test.each([
    [["MIT", "Apache-2.0"], "MIT, Apache-2.0"],
    [{ type: "ISC", url: "https://x" }, "ISC"],
  ])("normalizes license %j", (license, expected) => {
    expect(toPackageInfo("pkg", buildPackument({ license }))).toMatchObject({
      license: expected,
    });
  });

  test("returns null dependency counts when the latest manifest is missing", () => {
    expect(
      toPackageInfo(
        "pkg",
        buildPackument({ "dist-tags": { latest: "0.0.1" } }),
      ),
    ).toMatchObject({
      latestVersion: "0.0.1",
      dependenciesCount: null,
      devDependenciesCount: null,
    });
  });
});

describe("getLatestStableRelease", () => {
  test("ignores prereleases, unpublished versions and meta keys", () => {
    expect(getLatestStableRelease(buildPackument())).toEqual({
      version: "1.5.0",
      date: "2023-06-01T00:00:00.000Z",
    });
  });

  test("returns null without stable releases", () => {
    expect(
      getLatestStableRelease(
        buildPackument({
          versions: { "1.0.0-rc.1": {} },
          time: { "1.0.0-rc.1": "2020-01-01T00:00:00.000Z" },
        }),
      ),
    ).toBeNull();
    expect(getLatestStableRelease({ name: "x", versions: {} })).toBeNull();
  });
});

describe("getPackageInfo", () => {
  test("caches the derived record per package with tag and revalidate", async () => {
    fetchPackumentMock.mockResolvedValue(buildPackument());

    const info = await getPackageInfo("pkg");

    expect(info).toMatchObject({ projectName: "pkg", latestVersion: "2.0.0" });
    expect(unstableCacheMock).toHaveBeenCalledWith(
      expect.any(Function),
      ["package-info", "pkg"],
      {
        revalidate: PACKAGE_INFO_REVALIDATE_SECONDS,
        tags: ["package-info:pkg"],
      },
    );
    expect(fetchPackumentMock).toHaveBeenCalledWith("pkg");
  });

  test("calls the cached function without arguments", async () => {
    const cachedCalls: unknown[][] = [];
    unstableCacheMock.mockImplementation(
      (fn: (...args: unknown[]) => unknown) =>
        (...args: unknown[]) => {
          cachedCalls.push(args);
          return fn(...args);
        },
    );
    fetchPackumentMock.mockResolvedValue(buildPackument());

    await getPackageInfo("pkg");

    expect(cachedCalls).toEqual([[]]);
  });

  test("resolves null for a missing package so the miss is cached", async () => {
    fetchPackumentMock.mockResolvedValue(null);

    await expect(getPackageInfo("missing-pkg")).resolves.toBeNull();
  });

  test("propagates transient upstream errors so they are not cached", async () => {
    fetchPackumentMock.mockRejectedValue(
      new AppError("Registry request failed", { status: 502 }),
    );

    await expect(getPackageInfo("pkg")).rejects.toMatchObject({ status: 502 });
  });
});
