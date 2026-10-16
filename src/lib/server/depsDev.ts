import "server-only";
import { cacheDerived } from "@/lib/config/serverCache";
import { createBatchLoader } from "@/lib/server/batchLoader";
import { resolveLatestVersion } from "@/lib/server/latestVersion";
import {
  failed,
  found,
  missing,
  type PackageOutcome,
  toPackageResults,
} from "@/lib/server/packageResults";
import { upstreamFetch, upstreamStatusError } from "@/lib/server/upstreamFetch";
import AppError from "@/lib/utils/AppError";
import { z } from "zod";

export const DEPS_DEV_API_URL = "https://api.deps.dev/v3alpha";
export const DEPS_DEV_REVALIDATE_SECONDS = 24 * 60 * 60;
export const DEPS_DEV_MAX_PAGES = 20;

const GITHUB_PROJECT_PREFIX = "github.com/";
const NPM_SYSTEM = "NPM";
const INVALID_RESPONSE_STATUS = 502;

const optional = <T extends z.ZodType>(schema: T) =>
  schema.optional().catch(undefined);

const VersionSchema = z.object({
  licenses: optional(z.array(z.string())),
  advisoryKeys: optional(z.array(z.object({ id: optional(z.string()) }))),
  relatedProjects: optional(
    z.array(
      z.object({
        projectKey: optional(z.object({ id: optional(z.string()) })),
        relationType: optional(z.string()),
      }),
    ),
  ),
});

const ProjectSchema = z.object({
  openIssuesCount: optional(z.number()),
  starsCount: optional(z.number()),
  forksCount: optional(z.number()),
  scorecard: optional(z.object({ overallScore: optional(z.number()) })),
});

const pageSchema = <T extends z.ZodType>(item: T) =>
  z.object({
    responses: z.array(item).default([]),
    nextPageToken: z.string().optional(),
  });

const VersionBatchSchema = pageSchema(
  z.object({
    request: z.object({
      versionKey: z.object({ name: z.string(), version: z.string() }),
    }),
    version: optional(VersionSchema),
  }),
);

const ProjectBatchSchema = pageSchema(
  z.object({
    request: z.object({ projectKey: z.object({ id: z.string() }) }),
    project: optional(ProjectSchema),
  }),
);

type DepsDevVersion = z.output<typeof VersionSchema>;
type DepsDevProject = z.output<typeof ProjectSchema>;
type VersionKey = { name: string; version: string };

export type DepsDevInfo = ReturnType<typeof toDepsDevInfo>;

const toCacheKey = ({ name, version }: VersionKey) => `${name}@${version}`;

const invalidResponse = (label: string) =>
  new AppError(`${label} returned an invalid response`, {
    status: INVALID_RESPONSE_STATUS,
  });

const postBatchPage = async <T extends z.ZodType>(
  path: string,
  body: object,
  schema: T,
): Promise<z.output<T>> => {
  const label = `deps.dev ${path}`;
  const response = await upstreamFetch(label, `${DEPS_DEV_API_URL}/${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw upstreamStatusError(label, response.status);
  const parsed = schema.safeParse(await response.json());
  if (!parsed.success) throw invalidResponse(label);
  return parsed.data;
};

type BatchPage<R> = { responses: R[]; nextPageToken?: string };

const collectPages = async <R>(
  fetchPage: (pageToken: string | undefined) => Promise<BatchPage<R>>,
  pageToken?: string,
  page = 1,
): Promise<R[]> => {
  const { responses, nextPageToken } = await fetchPage(pageToken);
  if (!nextPageToken || page >= DEPS_DEV_MAX_PAGES) return responses;
  const rest = await collectPages(fetchPage, nextPageToken, page + 1);
  return [...responses, ...rest];
};

const fetchVersionBatch = async (keys: readonly VersionKey[]) => {
  const requests = keys.map(({ name, version }) => ({
    versionKey: { system: NPM_SYSTEM, name, version },
  }));
  const responses = await collectPages((pageToken) =>
    postBatchPage("versionbatch", { requests, pageToken }, VersionBatchSchema),
  );
  return new Map(
    responses.flatMap(({ request, version }) =>
      version ? [[toCacheKey(request.versionKey), version] as const] : [],
    ),
  );
};

const fetchProjectBatch = async (projectIds: readonly string[]) => {
  if (projectIds.length === 0) return new Map<string, DepsDevProject>();
  const requests = projectIds.map((id) => ({ projectKey: { id } }));
  const responses = await collectPages((pageToken) =>
    postBatchPage("projectbatch", { requests, pageToken }, ProjectBatchSchema),
  );
  return new Map(
    responses.flatMap(({ request, project }) =>
      project ? [[request.projectKey.id, project] as const] : [],
    ),
  );
};

export const getGithubProjectId = (version: DepsDevVersion) => {
  const related = version.relatedProjects?.find((project) =>
    project.projectKey?.id?.startsWith(GITHUB_PROJECT_PREFIX),
  );
  return related?.projectKey?.id ?? null;
};

const toDepsDevInfo = (
  version: string,
  versionData: DepsDevVersion,
  projectId: string | null,
  project: DepsDevProject | undefined,
) => ({
  version,
  vulnerabilityCount: versionData.advisoryKeys?.length ?? null,
  licenses: versionData.licenses ?? null,
  healthScore: project?.scorecard?.overallScore ?? null,
  starsCount: project?.starsCount ?? null,
  forksCount: project?.forksCount ?? null,
  openIssuesCount: project?.openIssuesCount ?? null,
  projectId,
});

const deriveInfo = (
  key: VersionKey,
  versions: ReadonlyMap<string, DepsDevVersion>,
  projects: ReadonlyMap<string, DepsDevProject>,
) => {
  const versionData = versions.get(toCacheKey(key));
  if (!versionData) return null;
  const projectId = getGithubProjectId(versionData);
  const project = projectId ? projects.get(projectId) : undefined;
  return toDepsDevInfo(key.version, versionData, projectId, project);
};

const uniqueProjectIds = (versions: ReadonlyMap<string, DepsDevVersion>) => [
  ...new Set(
    [...versions.values()].flatMap((version) => {
      const projectId = getGithubProjectId(version);
      return projectId ? [projectId] : [];
    }),
  ),
];

export async function fetchDepsDevBatch(keys: readonly VersionKey[]) {
  const versions = await fetchVersionBatch(keys);
  const projects = await fetchProjectBatch(uniqueProjectIds(versions));
  return new Map(
    keys.map((key) => [toCacheKey(key), deriveInfo(key, versions, projects)]),
  );
}

const parseCacheKey = (cacheKey: string): VersionKey => {
  const at = cacheKey.lastIndexOf("@");
  return { name: cacheKey.slice(0, at), version: cacheKey.slice(at + 1) };
};

const createCachedLoader = (keys: readonly VersionKey[]) => {
  const loader = createBatchLoader(keys.length, (cacheKeys) =>
    fetchDepsDevBatch(cacheKeys.map(parseCacheKey)),
  );
  const cached = cacheDerived(
    async (name: string, version: string) =>
      loader.load(toCacheKey({ name, version })),
    ["deps-dev"],
    { revalidate: DEPS_DEV_REVALIDATE_SECONDS },
  );
  return async (key: VersionKey) => {
    try {
      return await cached(key.name, key.version);
    } finally {
      loader.release(toCacheKey(key));
    }
  };
};

type Resolution =
  | { name: string; version: string }
  | { name: string; outcome: PackageOutcome<DepsDevInfo> };

const resolvePackage = async (name: string): Promise<Resolution> => {
  try {
    const version = await resolveLatestVersion(name);
    if (!version) return { name, outcome: missing(name) };
    return { name, version };
  } catch (error) {
    console.error(`Failed to resolve latest version of "${name}":`, error);
    return { name, outcome: failed(name) };
  }
};

const isResolved = (resolution: Resolution): resolution is VersionKey =>
  "version" in resolution;

const loadResolved = async (
  load: (key: VersionKey) => Promise<DepsDevInfo | null>,
  key: VersionKey,
): Promise<PackageOutcome<DepsDevInfo>> => {
  try {
    return found(key.name, await load(key));
  } catch (error) {
    console.error(`Failed to load deps.dev data for "${key.name}":`, error);
    return failed(key.name);
  }
};

const toOutcome = (
  resolution: Resolution,
  load: (key: VersionKey) => Promise<DepsDevInfo | null>,
) => {
  if (isResolved(resolution)) return loadResolved(load, resolution);
  return Promise.resolve(resolution.outcome);
};

export async function getDepsDevInfo(names: readonly string[]) {
  const resolutions = await Promise.all(names.map(resolvePackage));
  const load = createCachedLoader(resolutions.filter(isResolved));
  const outcomes = await Promise.all(
    resolutions.map((resolution) => toOutcome(resolution, load)),
  );
  return toPackageResults(outcomes);
}
