/**
 * @vitest-environment node
 */
import AppError from "@/lib/utils/AppError";
import { githubApiQueue } from "@/lib/utils/requestQueue";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import {
  buildPackageDataUrl,
  fetchBundleSizeBatch,
  fetchDepsDevBatch,
  fetchGithubContributorsCount,
  fetchGithubPullRequestsCount,
  fetchGithubRepoInfo,
  fetchPackageInfoBatch,
  loadBundleSize,
  loadDepsDev,
  loadPackageInfo,
  notFoundMessage,
  PACKAGE_DATA_ERROR_MESSAGES,
  readLastPage,
  toSpecName,
} from "./packageData";

const fetchMock = vi.fn<typeof fetch>();

const PACKAGE_INFO = {
  projectName: "react",
  repoName: "facebook/react",
  repositoryUrl: "git+https://github.com/facebook/react.git",
  homepage: "https://react.dev",
  description: "React",
  license: "MIT",
  createdAt: "2011-10-26T17:46:21.942Z",
  lastReleaseDate: "2024-04-25T18:00:00.000Z",
  latestVersion: "18.3.1",
  dependenciesCount: 1,
  devDependenciesCount: null,
  contributorsCount: 2,
  latestRelease: { version: "18.3.1", date: "2024-04-25T18:00:00.000Z" },
} as const;

const BUNDLE_SIZE = {
  version: "18.3.1",
  size: 6000,
  gzip: 2500,
  dependencyCount: 1,
  treeShakeable: false,
} as const;

const DEPS_DEV = {
  version: "18.3.1",
  vulnerabilityCount: 0,
  licenses: ["MIT"],
  healthScore: 7.5,
  starsCount: 220000,
  forksCount: 45000,
  openIssuesCount: 900,
  projectId: "github.com/facebook/react",
} as const;

const jsonResponse = (body: unknown, init: ResponseInit = {}) =>
  Response.json(body, init);

const signal = () => new AbortController().signal;

const requestedUrls = () =>
  fetchMock.mock.calls.map(([url]) => decodeURIComponent(String(url)));

const linkHeader = (url: string, lastPage: number) =>
  `<${url}&page=2>; rel="next", <${url}&page=${lastPage}>; rel="last"`;

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("buildPackageDataUrl", () => {
  test("sorts packages into one encoded comma list", () => {
    expect(
      decodeURIComponent(
        buildPackageDataUrl("/api/package-info", ["vue", "@a/b", "react"]),
      ),
    ).toBe("/api/package-info?packages=@a/b,react,vue");
  });
});

describe("toSpecName", () => {
  test.each([
    ["react@1.0.0", "react"],
    ["@scope/pkg@2.0.0", "@scope/pkg"],
    ["@scope/pkg", "@scope/pkg"],
    ["react", "react"],
  ])("reads the name of %s", (spec, name) => {
    expect(toSpecName(spec)).toBe(name);
  });
});

describe("fetchPackageInfoBatch", () => {
  test("passes the signal and reads each package entry", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ data: { react: PACKAGE_INFO }, errors: {} }),
    );
    const abortSignal = signal();

    const read = await fetchPackageInfoBatch(["react"], abortSignal);

    expect(fetchMock).toHaveBeenCalledWith(
      buildPackageDataUrl("/api/package-info", ["react"]),
      { signal: abortSignal },
    );
    expect(read("react")).toEqual(PACKAGE_INFO);
  });

  test.each([
    ["marked notFound", { ghost: null }, { ghost: "notFound" }],
    ["null without an error", { ghost: null }, undefined],
    ["missing from the response", {}, undefined],
  ])("maps a package %s to a 404 AppError", async (_, data, errors) => {
    fetchMock.mockResolvedValue(jsonResponse({ data, errors }));

    const read = await fetchPackageInfoBatch(["ghost"], signal());

    expect(() => read("ghost")).toThrow(
      new AppError(notFoundMessage("ghost"), { status: 404 }),
    );
    expect(() => read("ghost")).toThrow(
      expect.objectContaining({ status: 404 }),
    );
  });

  test("maps an upstream package error to a 502 AppError", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ data: { react: null }, errors: { react: "upstream" } }),
    );

    const read = await fetchPackageInfoBatch(["react"], signal());

    expect(() => read("react")).toThrow(
      expect.objectContaining({
        message: PACKAGE_DATA_ERROR_MESSAGES.packageInfo,
        status: 502,
      }),
    );
  });

  test("throws the route error with its HTTP status", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ error: "Too many requests" }, { status: 429 }),
    );

    await expect(fetchPackageInfoBatch(["react"], signal())).rejects.toEqual(
      expect.objectContaining({ message: "Too many requests", status: 429 }),
    );
  });

  test("falls back to a generic message for an unreadable error body", async () => {
    fetchMock.mockResolvedValue(new Response("oops", { status: 500 }));

    await expect(fetchPackageInfoBatch(["react"], signal())).rejects.toEqual(
      expect.objectContaining({
        message: PACKAGE_DATA_ERROR_MESSAGES.packageInfo,
        status: 500,
      }),
    );
  });

  test("rejects a malformed body with a 502 AppError", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ data: { react: { projectName: 1 } } }),
    );

    await expect(fetchPackageInfoBatch(["react"], signal())).rejects.toEqual(
      expect.objectContaining({ status: 502 }),
    );
  });
});

describe("fetchBundleSizeBatch", () => {
  test("requests name@version specs and reads entries by package name", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ data: { "@scope/pkg": BUNDLE_SIZE }, errors: {} }),
    );

    const read = await fetchBundleSizeBatch(["@scope/pkg@18.3.1"], signal());

    expect(requestedUrls()).toEqual([
      "/api/bundle-size?packages=@scope/pkg@18.3.1",
    ]);
    expect(read("@scope/pkg@18.3.1")).toEqual(BUNDLE_SIZE);
  });
});

describe("fetchDepsDevBatch", () => {
  test("reads deps.dev entries by package name", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ data: { react: DEPS_DEV }, errors: {} }),
    );

    const read = await fetchDepsDevBatch(["react"], signal());

    expect(requestedUrls()).toEqual(["/api/deps-dev?packages=react"]);
    expect(read("react")).toEqual(DEPS_DEV);
  });
});

describe("batch loaders", () => {
  test("merge package-info loads from the same tick into one request", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        data: {
          react: PACKAGE_INFO,
          vue: { ...PACKAGE_INFO, projectName: "vue" },
        },
      }),
    );

    const [react, vue] = await Promise.all([
      loadPackageInfo("react"),
      loadPackageInfo("vue"),
    ]);

    expect(requestedUrls()).toEqual(["/api/package-info?packages=react,vue"]);
    expect(react.projectName).toBe("react");
    expect(vue.projectName).toBe("vue");
  });

  test("load the bundle size for a pinned version", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ data: { react: BUNDLE_SIZE } }));

    await expect(loadBundleSize("react", "18.3.1")).resolves.toEqual(
      BUNDLE_SIZE,
    );
    expect(requestedUrls()).toEqual(["/api/bundle-size?packages=react@18.3.1"]);
  });

  test("load deps.dev data by name", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ data: { react: DEPS_DEV } }));

    await expect(loadDepsDev("react")).resolves.toEqual(DEPS_DEV);
  });
});

describe("readLastPage", () => {
  test("reads the page number of the last link", () => {
    expect(
      readLastPage(
        linkHeader(
          "https://api.github.com/repositories/1/pulls?per_page=1",
          57,
        ),
      ),
    ).toBe(57);
  });

  test.each([null, "", '<https://x?page=2>; rel="next"'])(
    "returns null without a last link (%s)",
    (link) => {
      expect(readLastPage(link)).toBeNull();
    },
  );
});

describe("GitHub fetchers", () => {
  test("pull requests count reads the last page and passes the signal through the queue", async () => {
    const addSpy = vi.spyOn(githubApiQueue, "add");
    const url = "https://api.github.com/repos/facebook/react/pulls?per_page=1";
    fetchMock.mockResolvedValue(
      jsonResponse([{ id: 1 }], { headers: { link: linkHeader(url, 123) } }),
    );
    const abortSignal = signal();

    await expect(
      fetchGithubPullRequestsCount("facebook/react", abortSignal),
    ).resolves.toBe(123);

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.github.com/repos/facebook/react/pulls?state=open&per_page=1",
      { signal: abortSignal },
    );
    expect(addSpy).toHaveBeenCalledWith(expect.any(Function), abortSignal);
  });

  test("contributors count falls back to the array length without a Link header", async () => {
    fetchMock.mockResolvedValue(jsonResponse([{ id: 1 }]));

    await expect(fetchGithubContributorsCount("a/b")).resolves.toBe(1);
    expect(requestedUrls()).toEqual([
      "https://api.github.com/repos/a/b/contributors?per_page=1",
    ]);
  });

  test("contributors count is 0 for an empty repository", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));

    await expect(fetchGithubContributorsCount("a/b")).resolves.toBe(0);
  });

  test.each([
    ["an error status", () => jsonResponse({}, { status: 403 })],
    ["a non-array body", () => jsonResponse({ message: "nope" })],
  ])("count is null for %s", async (_, response) => {
    fetchMock.mockResolvedValue(response());

    await expect(fetchGithubPullRequestsCount("a/b")).resolves.toBeNull();
  });

  test("repo info maps stars and open issues", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ stargazers_count: 5, open_issues_count: 2, extra: true }),
    );

    await expect(fetchGithubRepoInfo("a/b")).resolves.toEqual({
      starsCount: 5,
      openIssuesCount: 2,
    });
    expect(requestedUrls()).toEqual(["https://api.github.com/repos/a/b"]);
  });

  test.each([
    ["an error status", () => jsonResponse({}, { status: 404 })],
    ["a malformed body", () => jsonResponse({ stargazers_count: "x" })],
  ])("repo info is null for %s", async (_, response) => {
    fetchMock.mockResolvedValue(response());

    await expect(fetchGithubRepoInfo("a/b")).resolves.toBeNull();
  });
});
