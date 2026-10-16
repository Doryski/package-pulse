import {
  buildBulkRange,
  buildBundleSize,
  buildDepsDevProject,
  buildDepsDevVersion,
  buildGithubList,
  buildGithubRepo,
  buildOpenAiResponse,
  buildPackageDoc,
  buildRangeNotFound,
  buildRangePeriod,
  buildSearchResults,
  githubContributorsCount,
  githubPullsCount,
  isMissingPackage,
  MOCK_DEFAULT_SIMILAR,
} from "./data";

export const MOCK_HOSTS = {
  npmDownloads: "api.npmjs.org",
  registry: "registry.npmjs.org",
  github: "api.github.com",
  bundlephobia: "bundlephobia.com",
  depsDev: "api.deps.dev",
  openai: "api.openai.com",
} as const;

export type MockHost = (typeof MOCK_HOSTS)[keyof typeof MOCK_HOSTS];

const SENTRY_INGEST_HOST = /(^|\.)ingest\.([a-z]+\.)?sentry\.io$/;

export type MockTarget =
  | { kind: "range"; start: string; end: string; packages: string[] }
  | { kind: "package"; name: string; method: string }
  | { kind: "search"; text: string }
  | { kind: "bundle"; name: string }
  | { kind: "depsDevVersion"; name: string; version: string }
  | { kind: "depsDevProject"; projectId: string }
  | { kind: "githubRepo"; repo: string }
  | { kind: "githubContributors"; repo: string }
  | { kind: "githubPulls"; repo: string }
  | { kind: "openai" }
  | { kind: "sentry" };

export type MockHandler = (
  request: Request,
) => Response | undefined | Promise<Response | undefined>;

const CORS_HEADERS = { "access-control-allow-origin": "*" } as const;

export const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...CORS_HEADERS },
  });

export const emptyResponse = (status: number) =>
  new Response(null, { status, headers: CORS_HEADERS });

const safeDecode = (value: string) => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

const RANGE_PATH =
  /^\/downloads\/range\/(\d{4}-\d{2}-\d{2}):(\d{4}-\d{2}-\d{2})\/(.+)$/;
const DEPS_DEV_VERSION_PATH =
  /^\/v3\/systems\/npm\/packages\/([^/]+)\/versions\/([^/]+)$/;
const DEPS_DEV_PROJECT_PATH = /^\/v3\/projects\/([^/]+)$/;
const GITHUB_REPO_PATH = /^\/repos\/([^/]+\/[^/]+?)(\/contributors|\/pulls)?$/;

const parseRange = (url: URL): MockTarget | undefined => {
  const match = url.pathname.match(RANGE_PATH);
  if (!match) return undefined;
  const [, start = "", end = "", list = ""] = match;
  const packages = safeDecode(list).split(",").filter(Boolean);
  return { kind: "range", start, end, packages };
};

const parseRegistry = (url: URL, method: string): MockTarget | undefined => {
  if (url.pathname === "/-/v1/search") {
    return { kind: "search", text: url.searchParams.get("text") ?? "" };
  }
  const name = safeDecode(url.pathname.slice(1));
  if (!name || name.startsWith("-/")) return undefined;
  return { kind: "package", name, method };
};

const stripVersion = (spec: string) => {
  const at = spec.lastIndexOf("@");
  if (at <= 0) return spec;
  return spec.slice(0, at);
};

const parseBundlephobia = (url: URL): MockTarget | undefined => {
  if (url.pathname !== "/api/size") return undefined;
  const spec = url.searchParams.get("package");
  if (!spec) return undefined;
  return { kind: "bundle", name: stripVersion(spec) };
};

const parseDepsDev = (url: URL): MockTarget | undefined => {
  const version = url.pathname.match(DEPS_DEV_VERSION_PATH);
  if (version) {
    const [, name = "", spec = ""] = version;
    return {
      kind: "depsDevVersion",
      name: safeDecode(name),
      version: safeDecode(spec),
    };
  }
  const project = url.pathname.match(DEPS_DEV_PROJECT_PATH);
  if (!project) return undefined;
  return { kind: "depsDevProject", projectId: safeDecode(project[1] ?? "") };
};

const GITHUB_SUFFIX_KIND = {
  "/contributors": "githubContributors",
  "/pulls": "githubPulls",
} as const;

const parseGithub = (url: URL): MockTarget | undefined => {
  const match = url.pathname.match(GITHUB_REPO_PATH);
  if (!match) return undefined;
  const [, repo = "", suffix] = match;
  if (suffix === "/contributors" || suffix === "/pulls") {
    return { kind: GITHUB_SUFFIX_KIND[suffix], repo };
  }
  return { kind: "githubRepo", repo };
};

const parseOpenAi = (url: URL, method: string): MockTarget | undefined => {
  if (method !== "POST" || url.pathname !== "/v1/responses") return undefined;
  return { kind: "openai" };
};

export const parseMockTarget = (request: Request): MockTarget | undefined => {
  const url = new URL(request.url);
  const { method } = request;
  if (SENTRY_INGEST_HOST.test(url.hostname)) return { kind: "sentry" };
  if (url.hostname === MOCK_HOSTS.npmDownloads) return parseRange(url);
  if (url.hostname === MOCK_HOSTS.registry) return parseRegistry(url, method);
  if (url.hostname === MOCK_HOSTS.bundlephobia) return parseBundlephobia(url);
  if (url.hostname === MOCK_HOSTS.depsDev) return parseDepsDev(url);
  if (url.hostname === MOCK_HOSTS.github) return parseGithub(url);
  if (url.hostname === MOCK_HOSTS.openai) return parseOpenAi(url, method);
  return undefined;
};

export const targetPackages = (target: MockTarget): string[] => {
  if (target.kind === "range") return target.packages;
  if (target.kind === "package" || target.kind === "bundle") {
    return [target.name];
  }
  if (target.kind === "depsDevVersion") return [target.name];
  return [];
};

const isMissingRepo = (repo: string) =>
  repo.split("/").some((segment) => isMissingPackage(segment));

export const rangeResponse = (
  target: Extract<MockTarget, { kind: "range" }>,
  isMissing: (name: string) => boolean = isMissingPackage,
) => {
  const { start, end, packages } = target;
  if (packages.length > 1) {
    return jsonResponse(buildBulkRange(packages, start, end, isMissing));
  }
  const [pkg = ""] = packages;
  if (isMissing(pkg)) return jsonResponse(buildRangeNotFound(pkg), 404);
  return jsonResponse(buildRangePeriod(pkg, start, end));
};

export const packageResponse = (
  target: Extract<MockTarget, { kind: "package" }>,
) => {
  const missing = isMissingPackage(target.name);
  if (target.method === "HEAD") return emptyResponse(missing ? 404 : 200);
  if (missing) return jsonResponse({ error: "Not found" }, 404);
  return jsonResponse(buildPackageDoc(target.name));
};

const notFoundJson = () => jsonResponse({ message: "Not Found" }, 404);

const githubResponse = (repo: string, body: () => unknown) => {
  if (isMissingRepo(repo)) return notFoundJson();
  return jsonResponse(body());
};

const packageScopedResponse = (name: string, body: () => unknown) => {
  if (isMissingPackage(name)) return notFoundJson();
  return jsonResponse(body());
};

export const similarResponse = (similarProjects: readonly string[]) =>
  jsonResponse(buildOpenAiResponse(similarProjects));

const respondTo = (target: MockTarget): Response => {
  switch (target.kind) {
    case "range":
      return rangeResponse(target);
    case "package":
      return packageResponse(target);
    case "search":
      return jsonResponse(buildSearchResults(target.text));
    case "bundle":
      return packageScopedResponse(target.name, () =>
        buildBundleSize(target.name),
      );
    case "depsDevVersion":
      return packageScopedResponse(target.name, () =>
        buildDepsDevVersion(target.name),
      );
    case "depsDevProject":
      return githubResponse(target.projectId, () =>
        buildDepsDevProject(target.projectId),
      );
    case "githubRepo":
      return githubResponse(target.repo, () => buildGithubRepo(target.repo));
    case "githubContributors":
      return githubResponse(target.repo, () =>
        buildGithubList(githubContributorsCount(target.repo)),
      );
    case "githubPulls":
      return githubResponse(target.repo, () =>
        buildGithubList(githubPullsCount(target.repo)),
      );
    case "openai":
      return similarResponse(MOCK_DEFAULT_SIMILAR);
    case "sentry":
      return jsonResponse({});
  }
};

export const defaultMockHandler: MockHandler = (request) => {
  const target = parseMockTarget(request);
  if (!target) return undefined;
  return respondTo(target);
};
