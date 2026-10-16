import AppError from "@/lib/utils/AppError";
import createBatchLoader from "@/lib/utils/createBatchLoader";
import { githubApiQueue } from "@/lib/utils/requestQueue";
import * as z from "zod/mini";

const HTTP_STATUS = {
  noContent: 204,
  notFound: 404,
  badGateway: 502,
} as const;

export const PACKAGE_DATA_ERROR = {
  notFound: "notFound",
  upstream: "upstream",
} as const;

export const PACKAGE_DATA_ROUTES = {
  packageInfo: "/api/package-info",
  bundleSize: "/api/bundle-size",
  depsDev: "/api/deps-dev",
} as const;

export const PACKAGE_DATA_ERROR_MESSAGES = {
  packageInfo: "Failed to fetch package info",
  bundleSize: "Failed to fetch bundle sizes",
  depsDev: "Failed to fetch deps.dev data",
} as const;

export const GITHUB_REPOS_URL = "https://api.github.com/repos";

export const GITHUB_COUNT_PATHS = {
  pullRequests: "pulls?state=open&per_page=1",
  contributors: "contributors?per_page=1",
} as const;

const ReleaseSchema = z.object({ version: z.string(), date: z.string() });

const PackageInfoSchema = z.object({
  projectName: z.string(),
  repoName: z.nullable(z.string()),
  repositoryUrl: z.nullable(z.string()),
  homepage: z.nullable(z.string()),
  description: z.nullable(z.string()),
  license: z.nullable(z.string()),
  createdAt: z.nullable(z.string()),
  lastReleaseDate: z.nullable(z.string()),
  latestVersion: z.nullable(z.string()),
  dependenciesCount: z.nullable(z.number()),
  devDependenciesCount: z.nullable(z.number()),
  contributorsCount: z.number(),
  latestRelease: z.nullable(ReleaseSchema),
});

const BundleSizeSchema = z.object({
  version: z.string(),
  size: z.nullable(z.number()),
  gzip: z.nullable(z.number()),
  dependencyCount: z.nullable(z.number()),
  treeShakeable: z.boolean(),
});

const DepsDevSchema = z.object({
  version: z.string(),
  vulnerabilityCount: z.nullable(z.number()),
  licenses: z.nullable(z.array(z.string())),
  healthScore: z.nullable(z.number()),
  starsCount: z.nullable(z.number()),
  forksCount: z.nullable(z.number()),
  openIssuesCount: z.nullable(z.number()),
  projectId: z.nullable(z.string()),
});

const GithubRepoSchema = z.object({
  stargazers_count: z.number(),
  open_issues_count: z.number(),
});

const GithubListSchema = z.array(z.unknown());

const ErrorBodySchema = z.object({ error: z.string() });

export type PackageInfo = z.infer<typeof PackageInfoSchema>;
export type BundleSize = z.infer<typeof BundleSizeSchema>;
export type DepsDevInfo = z.infer<typeof DepsDevSchema>;
export type GithubRepoStats = { starsCount: number; openIssuesCount: number };

type PackageDataSource<T extends z.ZodMiniType> = {
  path: string;
  schema: T;
  errorMessage: string;
  toEntryName?: (key: string) => string;
};

const toPackageResultsSchema = <T extends z.ZodMiniType>(schema: T) =>
  z.object({
    data: z.record(z.string(), z.nullable(schema)),
    errors: z._default(z.record(z.string(), z.string()), {}),
  });

type PackageResults<T extends z.ZodMiniType> = z.infer<
  ReturnType<typeof toPackageResultsSchema<T>>
>;

export const notFoundMessage = (name: string) => `Package "${name}" not found`;

export const toPackageSpec = (name: string, version: string) =>
  `${name}@${version}`;

export const toSpecName = (spec: string) => {
  const at = spec.lastIndexOf("@");
  if (at <= 0) return spec;
  return spec.slice(0, at);
};

export const buildPackageDataUrl = (path: string, keys: readonly string[]) =>
  `${path}?packages=${encodeURIComponent(keys.toSorted().join(","))}`;

const readErrorMessage = async (response: Response, fallback: string) => {
  const body = await response.json().catch(() => null);
  const parsed = ErrorBodySchema.safeParse(body);
  if (!parsed.success || !parsed.data.error) return fallback;
  return parsed.data.error;
};

const toMissingError = (
  name: string,
  error: string | undefined,
  errorMessage: string,
) => {
  if (error === PACKAGE_DATA_ERROR.upstream) {
    return new AppError(errorMessage, { status: HTTP_STATUS.badGateway });
  }
  return new AppError(notFoundMessage(name), { status: HTTP_STATUS.notFound });
};

const readPackageEntry =
  <T extends z.ZodMiniType>(
    { data, errors }: PackageResults<T>,
    { toEntryName = (key) => key, errorMessage }: PackageDataSource<T>,
  ) =>
  (key: string): z.infer<T> => {
    const name = toEntryName(key);
    const entry = data[name];
    if (entry === undefined || entry === null) {
      throw toMissingError(name, errors[name], errorMessage);
    }
    return entry;
  };

export const createPackageDataFetcher = <T extends z.ZodMiniType>(
  source: PackageDataSource<T>,
) => {
  const responseSchema = toPackageResultsSchema(source.schema);
  return async (keys: string[], signal: AbortSignal) => {
    const response = await fetch(buildPackageDataUrl(source.path, keys), {
      signal,
    });
    if (!response.ok) {
      throw new AppError(
        await readErrorMessage(response, source.errorMessage),
        { status: response.status },
      );
    }
    const parsed = responseSchema.safeParse(await response.json());
    if (!parsed.success) {
      throw new AppError(source.errorMessage, {
        status: HTTP_STATUS.badGateway,
      });
    }
    return readPackageEntry(parsed.data, source);
  };
};

export const fetchPackageInfoBatch = createPackageDataFetcher({
  path: PACKAGE_DATA_ROUTES.packageInfo,
  schema: PackageInfoSchema,
  errorMessage: PACKAGE_DATA_ERROR_MESSAGES.packageInfo,
});

export const fetchBundleSizeBatch = createPackageDataFetcher({
  path: PACKAGE_DATA_ROUTES.bundleSize,
  schema: BundleSizeSchema,
  errorMessage: PACKAGE_DATA_ERROR_MESSAGES.bundleSize,
  toEntryName: toSpecName,
});

export const fetchDepsDevBatch = createPackageDataFetcher({
  path: PACKAGE_DATA_ROUTES.depsDev,
  schema: DepsDevSchema,
  errorMessage: PACKAGE_DATA_ERROR_MESSAGES.depsDev,
});

const packageInfoLoader = createBatchLoader({
  loadBatch: fetchPackageInfoBatch,
});
const bundleSizeLoader = createBatchLoader({
  loadBatch: fetchBundleSizeBatch,
});
const depsDevLoader = createBatchLoader({ loadBatch: fetchDepsDevBatch });

export const loadPackageInfo = (name: string, signal?: AbortSignal) =>
  packageInfoLoader.load(name, signal);

export const loadBundleSize = (
  name: string,
  version: string,
  signal?: AbortSignal,
) => bundleSizeLoader.load(toPackageSpec(name, version), signal);

export const loadDepsDev = (name: string, signal?: AbortSignal) =>
  depsDevLoader.load(name, signal);

const LAST_PAGE_PATTERN = /<[^>]*[?&]page=(\d+)[^>]*>;\s*rel="last"/;

export const readLastPage = (link: string | null) => {
  const page = link?.match(LAST_PAGE_PATTERN)?.[1];
  if (!page) return null;
  return Number(page);
};

const githubRepoUrl = (repoName: string, path = "") =>
  [`${GITHUB_REPOS_URL}/${repoName}`, path].filter(Boolean).join("/");

const fetchGithub = (url: string, signal?: AbortSignal) =>
  githubApiQueue.add(() => fetch(url, { signal }), signal);

const readListLength = async (response: Response) => {
  const parsed = GithubListSchema.safeParse(await response.json());
  if (!parsed.success) return null;
  return parsed.data.length;
};

const readGithubCount = async (response: Response) => {
  if (response.status === HTTP_STATUS.noContent) return 0;
  if (!response.ok) return null;
  return readLastPage(response.headers.get("link")) ?? readListLength(response);
};

const toGithubRepoStats = (body: unknown): GithubRepoStats | null => {
  const parsed = GithubRepoSchema.safeParse(body);
  if (!parsed.success) return null;
  return {
    starsCount: parsed.data.stargazers_count,
    openIssuesCount: parsed.data.open_issues_count,
  };
};

export const fetchGithubRepoInfo = async (
  repoName: string,
  signal?: AbortSignal,
) => {
  const response = await fetchGithub(githubRepoUrl(repoName), signal);
  if (!response.ok) return null;
  return toGithubRepoStats(await response.json());
};

const fetchGithubCount = async (
  repoName: string,
  path: string,
  signal?: AbortSignal,
) => readGithubCount(await fetchGithub(githubRepoUrl(repoName, path), signal));

export const fetchGithubPullRequestsCount = (
  repoName: string,
  signal?: AbortSignal,
) => fetchGithubCount(repoName, GITHUB_COUNT_PATHS.pullRequests, signal);

export const fetchGithubContributorsCount = (
  repoName: string,
  signal?: AbortSignal,
) => fetchGithubCount(repoName, GITHUB_COUNT_PATHS.contributors, signal);
