/**
 * @vitest-environment node
 */
import * as Sentry from "@sentry/nextjs";
import {
  encodeRegistryPackageName,
  fetchBundleSize,
  fetchContributorsCount,
  fetchDepsDev,
  fetchGithubPullRequestsCount,
  fetchGithubRepoInfo,
  fetchPackageInfo,
  getRepoNameFromUrl,
} from "@/api/fetchPackageInfo";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));

const fetchMock = vi.fn();

const okJson = (body: unknown) => ({
  ok: true,
  status: 200,
  json: async () => body,
});

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

describe("getRepoNameFromUrl / encodeRegistryPackageName", () => {
  test("strips git prefixes and host", () => {
    expect(
      getRepoNameFromUrl("git+https://github.com/facebook/react.git"),
    ).toBe("facebook/react");
  });

  test("keeps the scope at sign unencoded", () => {
    expect(encodeRegistryPackageName("@scope/pkg")).toBe("@scope%2Fpkg");
    expect(encodeRegistryPackageName("react")).toBe("react");
  });
});

describe("fetchPackageInfo", () => {
  const fullPackage = {
    name: "react",
    description: "lib",
    homepage: "https://react.dev",
    license: "MIT",
    keywords: ["ui"],
    repository: { url: "git+https://github.com/facebook/react.git" },
    users: { a: true, b: true },
    "dist-tags": { latest: "2.0.0" },
    time: {
      created: "2020-01-01T00:00:00.000Z",
      modified: "2024-01-01T00:00:00.000Z",
      "1.0.0": "2020-01-01T00:00:00.000Z",
      "2.0.0": "2021-01-01T00:00:00.000Z",
      "2.0.0-beta.1": "2020-12-01T00:00:00.000Z",
    },
    versions: {
      "2.0.0": {
        dependencies: { a: "1" },
        devDependencies: { b: "1", c: "1" },
      },
      "1.0.0": {},
      "2.0.0-beta.1": {},
      "0.0.1": {},
    },
  };

  test("maps the registry document into package info", async () => {
    fetchMock.mockResolvedValue(okJson(fullPackage));

    const info = await fetchPackageInfo("@scope/react");

    expect(fetchMock.mock.calls[0]![0]).toBe(
      "https://registry.npmjs.org/@scope%2Freact",
    );
    expect(info).toMatchObject({
      projectName: "@scope/react",
      repoName: "facebook/react",
      keywords: ["ui"],
      lastReleaseDate: "2024-01-01T00:00:00.000Z",
      contributorsCount: 2,
      dependenciesCount: 1,
      devDependenciesCount: 2,
      homepage: "https://react.dev",
      license: "MIT",
      description: "lib",
      createdAt: "2020-01-01T00:00:00.000Z",
      repositoryUrl: "git+https://github.com/facebook/react.git",
    });
    expect(info.versions).toEqual([
      { version: "1.0.0", date: "2020-01-01T00:00:00.000Z" },
      { version: "2.0.0", date: "2021-01-01T00:00:00.000Z" },
    ]);
  });

  test("handles string repositories and minimal documents", async () => {
    fetchMock.mockResolvedValueOnce(
      okJson({ name: "a", repository: "https://github.com/x/y" }),
    );

    const info = await fetchPackageInfo("a");

    expect(info).toMatchObject({
      repoName: "x/y",
      contributorsCount: 0,
      dependenciesCount: null,
      devDependenciesCount: null,
      latestVersion: null,
      versions: [],
    });
  });

  test("falls back to latest version keywords and null counts when absent", async () => {
    fetchMock.mockResolvedValue(
      okJson({
        name: "a",
        "dist-tags": { latest: "1.0.0" },
        versions: { "1.0.0": { keywords: ["k"] } },
      }),
    );

    const info = await fetchPackageInfo("a");

    expect(info.keywords).toEqual(["k"]);
    expect(info.repoName).toBeNull();
    expect(info.dependenciesCount).toBeNull();
  });

  test("rethrows on a non-ok response", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({}),
    });

    await expect(fetchPackageInfo("ghost")).rejects.toThrow(
      'Failed to fetch package "ghost": 404',
    );
    expect(console.error).toHaveBeenCalled();
  });

  test("rethrows on a network error", async () => {
    fetchMock.mockRejectedValue(new Error("offline"));

    await expect(fetchPackageInfo("a")).rejects.toThrow("offline");
  });

  test("reports schema-invalid data to Sentry and still returns it", async () => {
    vi.useFakeTimers();
    fetchMock.mockResolvedValue(
      okJson({ name: 1, "dist-tags": { latest: "1.0.0" } }),
    );

    await fetchPackageInfo("a");
    vi.runAllTimers();
    vi.useRealTimers();

    expect(Sentry.captureException).toHaveBeenCalled();
  });
});

describe("github fetchers", () => {
  test("fetchGithubRepoInfo returns the repo payload", async () => {
    const repo = { id: 1, stargazers_count: 5 };
    fetchMock.mockResolvedValue(okJson(repo));
    vi.useFakeTimers();

    const result = await fetchGithubRepoInfo("facebook/react");
    vi.runAllTimers();
    vi.useRealTimers();

    expect(fetchMock.mock.calls[0]![0]).toBe(
      "https://api.github.com/repos/facebook/react",
    );
    expect(result).toEqual(repo);
    expect(Sentry.captureException).toHaveBeenCalled();
  });

  test("fetchGithubRepoInfo propagates network errors", async () => {
    fetchMock.mockRejectedValue(new Error("offline"));

    await expect(fetchGithubRepoInfo("a/b")).rejects.toThrow("offline");
  });

  test("fetchContributorsCount counts the returned array", async () => {
    fetchMock.mockResolvedValue(okJson([{ a: 1 }, { a: 2 }, { a: 3 }]));

    expect(await fetchContributorsCount("a/b")).toBe(3);
    expect(fetchMock.mock.calls[0]![0]).toBe(
      "https://api.github.com/repos/a/b/contributors",
    );
  });

  test("fetchGithubPullRequestsCount counts the returned array", async () => {
    fetchMock.mockResolvedValue(okJson([{ a: 1 }]));

    expect(await fetchGithubPullRequestsCount("a/b")).toBe(1);
    expect(fetchMock.mock.calls[0]![0]).toBe(
      "https://api.github.com/repos/a/b/pulls",
    );
  });
});

describe("fetchBundleSize", () => {
  const bundle = {
    name: "react",
    version: "1.0.0",
    size: 100,
    gzip: 50,
    hasJSModule: "index.mjs",
    hasSideEffects: false,
  };

  test("requests name@version and derives treeShakeable", async () => {
    fetchMock.mockResolvedValue(
      okJson({ ...bundle, hasJSModule: true, hasSideEffects: false }),
    );

    const result = await fetchBundleSize("@scope/a", "1.0.0");

    expect(fetchMock.mock.calls[0]![0]).toBe(
      "https://bundlephobia.com/api/size?package=%40scope%2Fa%401.0.0",
    );
    expect(result?.treeShakeable).toBe(true);
  });

  test("requests the bare name and flags side effects as not tree shakeable", async () => {
    fetchMock.mockResolvedValue(
      okJson({ ...bundle, hasJSModule: true, hasSideEffects: true }),
    );

    const result = await fetchBundleSize("react");

    expect(fetchMock.mock.calls[0]![0]).toBe(
      "https://bundlephobia.com/api/size?package=react",
    );
    expect(result?.treeShakeable).toBe(false);
  });

  test("returns null when the request fails", async () => {
    fetchMock.mockRejectedValue(new Error("offline"));

    expect(await fetchBundleSize("react")).toBeNull();
  });

  test("returns null without parsing when the response is not ok", async () => {
    const json = vi.fn();
    fetchMock.mockResolvedValue({ ok: false, status: 429, json });

    expect(await fetchBundleSize("react")).toBeNull();
    expect(json).not.toHaveBeenCalled();
  });
});

describe("fetchDepsDev", () => {
  const versionWith = (relatedProjects?: unknown[]) => ({
    advisoryKeys: [{ id: "a" }, { id: "b" }],
    licenses: ["MIT"],
    relatedProjects,
  });

  test("returns version data only when no github project is linked", async () => {
    fetchMock.mockResolvedValue(
      okJson(versionWith([{ projectKey: { id: "gitlab.com/x/y" } }, {}])),
    );

    const result = await fetchDepsDev("react", "1.0.0");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]![0]).toBe(
      "https://api.deps.dev/v3/systems/npm/packages/react/versions/1.0.0",
    );
    expect(result).toEqual({
      vulnerabilityCount: 2,
      licenses: ["MIT"],
      healthScore: undefined,
      starsCount: undefined,
      forksCount: undefined,
      openIssuesCount: undefined,
    });
  });

  test("merges project data when a github project is linked", async () => {
    fetchMock
      .mockResolvedValueOnce(
        okJson(versionWith([{ projectKey: { id: "github.com/x/y" } }])),
      )
      .mockResolvedValueOnce(
        okJson({
          starsCount: 10,
          forksCount: 2,
          openIssuesCount: 1,
          scorecard: { overallScore: 7.5 },
        }),
      );

    const result = await fetchDepsDev("react", "1.0.0");

    expect(fetchMock.mock.calls[1]![0]).toBe(
      "https://api.deps.dev/v3/projects/github.com%2Fx%2Fy",
    );
    expect(result).toEqual({
      vulnerabilityCount: 2,
      licenses: ["MIT"],
      healthScore: 7.5,
      starsCount: 10,
      forksCount: 2,
      openIssuesCount: 1,
    });
  });

  test("handles a version without related projects", async () => {
    fetchMock.mockResolvedValue(okJson({}));

    const result = await fetchDepsDev("react", "1.0.0");

    expect(result?.vulnerabilityCount).toBeUndefined();
    expect(result?.healthScore).toBeUndefined();
  });

  test("returns null when the request fails", async () => {
    fetchMock.mockRejectedValue(new Error("offline"));

    expect(await fetchDepsDev("react", "1.0.0")).toBeNull();
  });

  test("returns null when the project request fails", async () => {
    fetchMock
      .mockResolvedValueOnce(
        okJson(versionWith([{ projectKey: { id: "github.com/x/y" } }])),
      )
      .mockRejectedValueOnce(new Error("offline"));

    expect(await fetchDepsDev("react", "1.0.0")).toBeNull();
  });
});

describe("non-ok upstream responses", () => {
  const notOk = (status: number) => ({
    ok: false,
    status,
    json: vi.fn(),
  });

  test("github repo info returns null on rate limit", async () => {
    fetchMock.mockResolvedValue(notOk(403));
    expect(await fetchGithubRepoInfo("x/y")).toBeNull();
  });

  test("contributors count returns null on error and 0 for an empty repo", async () => {
    fetchMock.mockResolvedValueOnce(notOk(404));
    expect(await fetchContributorsCount("x/y")).toBeNull();
    fetchMock.mockResolvedValueOnce({ ok: true, status: 204, json: vi.fn() });
    expect(await fetchContributorsCount("x/y")).toBe(0);
  });

  test("pull requests count returns null on error", async () => {
    fetchMock.mockResolvedValue(notOk(403));
    expect(await fetchGithubPullRequestsCount("x/y")).toBeNull();
  });

  test("deps.dev returns null when the version is not indexed", async () => {
    fetchMock.mockResolvedValue(notOk(404));
    expect(await fetchDepsDev("react", "99.0.0")).toBeNull();
  });

  test("deps.dev keeps version data when the project lookup fails", async () => {
    fetchMock
      .mockResolvedValueOnce(
        okJson({
          advisoryKeys: [{ id: "a" }],
          licenses: ["MIT"],
          relatedProjects: [
            {
              projectKey: { id: "github.com/x/y" },
              relationType: "SOURCE_REPO",
            },
          ],
        }),
      )
      .mockResolvedValueOnce(notOk(404));

    expect(await fetchDepsDev("react", "1.0.0")).toEqual({
      vulnerabilityCount: 1,
      licenses: ["MIT"],
      healthScore: undefined,
      starsCount: undefined,
      forksCount: undefined,
      openIssuesCount: undefined,
    });
  });
});
