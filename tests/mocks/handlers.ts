import {
  buildBulkRange,
  buildBundleSize,
  buildDepsDevProject,
  buildDepsDevProjectBatch,
  buildDepsDevVersion,
  buildDepsDevVersionBatch,
  buildGithubList,
  buildGithubRepo,
  buildLatestManifest,
  buildOpenAiResponse,
  buildPackageDoc,
  buildRangeNotFound,
  buildRangePeriod,
  buildSearchResults,
  type DepsDevVersionKey,
  githubContributorsCount,
  githubPullsCount,
  isMissingPackage,
  MOCK_DEFAULT_SIMILAR,
} from "./data";
import { z } from "zod";

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
  | { kind: "latest"; name: string }
  | { kind: "search"; text: string }
  | { kind: "bundle"; name: string; version?: string }
  | { kind: "depsDevVersion"; name: string; version: string }
  | { kind: "depsDevProject"; projectId: string }
  | { kind: "depsDevVersionBatch"; keys: DepsDevVersionKey[] }
  | { kind: "depsDevProjectBatch"; projectIds: string[] }
  | { kind: "githubRepo"; repo: string }
  | { kind: "githubContributors"; repo: string; url: URL }
  | { kind: "githubPulls"; repo: string; url: URL }
  | { kind: "openai" }
  | { kind: "sentry" };

export type MockHandler = (
  request: Request,
) => Response | undefined | Promise<Response | undefined>;

const CORS_HEADERS = { "access-control-allow-origin": "*" } as const;

export const jsonResponse = (
  body: unknown,
  status = 200,
  headers: Record<string, string> = {},
) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json",
      ...CORS_HEADERS,
      ...headers,
    },
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
const REGISTRY_LATEST_PATH = /^(@[^/]+\/[^/]+|[^@/][^/]*)\/latest$/;
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
  const path = safeDecode(url.pathname.slice(1));
  if (!path || path.startsWith("-/")) return undefined;
  const latest = path.match(REGISTRY_LATEST_PATH);
  if (latest) return { kind: "latest", name: latest[1] ?? "" };
  return { kind: "package", name: path, method };
};

const splitSpec = (spec: string) => {
  const at = spec.lastIndexOf("@");
  if (at <= 0) return { name: spec };
  return { name: spec.slice(0, at), version: spec.slice(at + 1) };
};

const parseBundlephobia = (url: URL): MockTarget | undefined => {
  if (url.pathname !== "/api/size") return undefined;
  const spec = url.searchParams.get("package");
  if (!spec) return undefined;
  return { kind: "bundle", ...splitSpec(spec) };
};

const DEPS_DEV_BATCH_PATH = {
  version: "/v3alpha/versionbatch",
  project: "/v3alpha/projectbatch",
} as const;

const VersionBatchBodySchema = z.object({
  requests: z.array(
    z.object({
      versionKey: z.object({ name: z.string(), version: z.string() }),
    }),
  ),
});

const ProjectBatchBodySchema = z.object({
  requests: z.array(z.object({ projectKey: z.object({ id: z.string() }) })),
});

const readJsonBody = async (request: Request) => {
  try {
    return await request.json();
  } catch {
    return undefined;
  }
};

const parseDepsDevBatch = async (
  url: URL,
  request: Request,
): Promise<MockTarget | undefined> => {
  if (request.method !== "POST") return undefined;
  if (url.pathname === DEPS_DEV_BATCH_PATH.version) {
    const body = VersionBatchBodySchema.safeParse(await readJsonBody(request));
    if (!body.success) return undefined;
    const keys = body.data.requests.map(({ versionKey }) => versionKey);
    return { kind: "depsDevVersionBatch", keys };
  }
  if (url.pathname === DEPS_DEV_BATCH_PATH.project) {
    const body = ProjectBatchBodySchema.safeParse(await readJsonBody(request));
    if (!body.success) return undefined;
    const projectIds = body.data.requests.map(
      ({ projectKey }) => projectKey.id,
    );
    return { kind: "depsDevProjectBatch", projectIds };
  }
  return undefined;
};

const parseDepsDev = (url: URL, request: Request) => {
  if (url.pathname.startsWith("/v3alpha/")) {
    return parseDepsDevBatch(url, request);
  }
  return parseDepsDevRest(url);
};

const parseDepsDevRest = (url: URL): MockTarget | undefined => {
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
    return { kind: GITHUB_SUFFIX_KIND[suffix], repo, url };
  }
  return { kind: "githubRepo", repo };
};

const parseOpenAi = (url: URL, method: string): MockTarget | undefined => {
  if (method !== "POST" || url.pathname !== "/v1/responses") return undefined;
  return { kind: "openai" };
};

export const parseMockTarget = async (
  request: Request,
): Promise<MockTarget | undefined> => {
  const url = new URL(request.url);
  const { method } = request;
  if (SENTRY_INGEST_HOST.test(url.hostname)) return { kind: "sentry" };
  if (url.hostname === MOCK_HOSTS.npmDownloads) return parseRange(url);
  if (url.hostname === MOCK_HOSTS.registry) return parseRegistry(url, method);
  if (url.hostname === MOCK_HOSTS.bundlephobia) return parseBundlephobia(url);
  if (url.hostname === MOCK_HOSTS.depsDev) return parseDepsDev(url, request);
  if (url.hostname === MOCK_HOSTS.github) return parseGithub(url);
  if (url.hostname === MOCK_HOSTS.openai) return parseOpenAi(url, method);
  return undefined;
};

export const targetPackages = (target: MockTarget): string[] => {
  if (target.kind === "range") return target.packages;
  if (
    target.kind === "package" ||
    target.kind === "latest" ||
    target.kind === "bundle"
  ) {
    return [target.name];
  }
  if (target.kind === "depsDevVersion") return [target.name];
  if (target.kind === "depsDevVersionBatch") {
    return target.keys.map(({ name }) => name);
  }
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

const GITHUB_SINGLE_PAGE = "1";

const githubPageUrl = (url: URL, page: number) => {
  const pageUrl = new URL(url);
  pageUrl.searchParams.set("page", String(page));
  return pageUrl.toString();
};

const githubLinkHeader = (url: URL, lastPage: number) =>
  [
    `<${githubPageUrl(url, 2)}>; rel="next"`,
    `<${githubPageUrl(url, lastPage)}>; rel="last"`,
  ].join(", ");

const githubPaginatedResponse = (url: URL, count: number) => {
  const headers = { "access-control-expose-headers": "Link" };
  const body = buildGithubList(Math.min(count, 1));
  if (count <= 1) return jsonResponse(body, 200, headers);
  return jsonResponse(body, 200, {
    ...headers,
    link: githubLinkHeader(url, count),
  });
};

const githubListResponse = (repo: string, url: URL, count: number) => {
  if (isMissingRepo(repo)) return notFoundJson();
  if (url.searchParams.get("per_page") !== GITHUB_SINGLE_PAGE) {
    return jsonResponse(buildGithubList(count));
  }
  return githubPaginatedResponse(url, count);
};

export const depsDevVersionBatchResponse = (
  target: Extract<MockTarget, { kind: "depsDevVersionBatch" }>,
  isMissing: (name: string) => boolean = isMissingPackage,
) => jsonResponse(buildDepsDevVersionBatch(target.keys, isMissing));

export const similarResponse = (similarProjects: readonly string[]) =>
  jsonResponse(buildOpenAiResponse(similarProjects));

const respondTo = (target: MockTarget): Response => {
  switch (target.kind) {
    case "range":
      return rangeResponse(target);
    case "package":
      return packageResponse(target);
    case "latest":
      return packageScopedResponse(target.name, () =>
        buildLatestManifest(target.name),
      );
    case "search":
      return jsonResponse(buildSearchResults(target.text));
    case "bundle":
      return packageScopedResponse(target.name, () =>
        buildBundleSize(target.name, target.version),
      );
    case "depsDevVersion":
      return packageScopedResponse(target.name, () =>
        buildDepsDevVersion(target.name),
      );
    case "depsDevProject":
      return githubResponse(target.projectId, () =>
        buildDepsDevProject(target.projectId),
      );
    case "depsDevVersionBatch":
      return depsDevVersionBatchResponse(target);
    case "depsDevProjectBatch":
      return jsonResponse(
        buildDepsDevProjectBatch(target.projectIds, isMissingRepo),
      );
    case "githubRepo":
      return githubResponse(target.repo, () => buildGithubRepo(target.repo));
    case "githubContributors":
      return githubListResponse(
        target.repo,
        target.url,
        githubContributorsCount(target.repo),
      );
    case "githubPulls":
      return githubListResponse(
        target.repo,
        target.url,
        githubPullsCount(target.repo),
      );
    case "openai":
      return similarResponse(MOCK_DEFAULT_SIMILAR);
    case "sentry":
      return jsonResponse({});
  }
};

export const defaultMockHandler: MockHandler = async (request) => {
  const target = await parseMockTarget(request);
  if (!target) return undefined;
  return respondTo(target);
};
