import "server-only";
import { getUpstreamFetchInit } from "@/lib/config/upstreamFetchInit";
import AppError from "@/lib/utils/AppError";
import safeParse from "@/lib/utils/safeParse";
import { z } from "zod";

export const NPM_REGISTRY_URL = "https://registry.npmjs.org";
export const REGISTRY_TIMEOUT_MS = 10_000;

const REGISTRY_REVALIDATE_SECONDS = 3600;
const ABBREVIATED_PACKUMENT = "application/vnd.npm.install-v1+json";
const UPSTREAM_FAILURE_STATUS = 502;
const TIMEOUT_STATUS = 504;

const RepositorySchema = z.union([
  z.string(),
  z.looseObject({ type: z.string().optional(), url: z.string() }),
]);

const LicenseSchema = z.union([
  z.string(),
  z.looseObject({ type: z.string() }),
]);

export const LatestManifestSchema = z
  .looseObject({
    name: z.string(),
    version: z.string(),
    description: z.string().optional(),
    keywords: z.array(z.string()).optional(),
    repository: RepositorySchema.optional(),
    license: LicenseSchema.optional(),
    homepage: z.string().optional(),
    dependencies: z.record(z.string(), z.string()).optional(),
  })
  .describe("NpmLatestManifest");

export const PackumentSchema = z
  .looseObject({
    name: z.string(),
    "dist-tags": z.record(z.string(), z.string()).optional(),
    versions: z.record(z.string(), z.unknown()).optional(),
    time: z.record(z.string(), z.string()).optional(),
  })
  .describe("NpmPackument");

export type LatestManifest = z.output<typeof LatestManifestSchema>;
export type Packument = z.output<typeof PackumentSchema>;

export const encodeRegistryPackageName = (name: string) =>
  encodeURIComponent(name).replace(/^%40/, "@");

const registryUrl = (name: string, suffix = "") =>
  `${NPM_REGISTRY_URL}/${encodeRegistryPackageName(name)}${suffix}`;

const withTimeout = (signal?: AbortSignal) => {
  const timeout = AbortSignal.timeout(REGISTRY_TIMEOUT_MS);
  if (!signal) return timeout;
  return AbortSignal.any([signal, timeout]);
};

const isTimeoutError = (error: unknown) =>
  error instanceof Error && error.name === "TimeoutError";

const toRegistryError = (name: string, error: unknown) => {
  if (!isTimeoutError(error)) return error;
  return new AppError(`Registry request for "${name}" timed out`, {
    status: TIMEOUT_STATUS,
  });
};

const registryFetch = async (name: string, url: string, init: RequestInit) => {
  try {
    return await fetch(url, init);
  } catch (error) {
    throw toRegistryError(name, error);
  }
};

const upstreamError = (name: string, status: number) =>
  new AppError(`Registry request for "${name}" failed: ${status}`, {
    status: UPSTREAM_FAILURE_STATUS,
  });

const readDocument = async <T extends z.ZodType>(
  name: string,
  response: Response,
  schema: T,
): Promise<z.output<T> | null> => {
  if (response.status === 404) return null;
  if (!response.ok) throw upstreamError(name, response.status);
  return safeParse(await response.json(), schema);
};

export async function fetchPackageExists(name: string, signal?: AbortSignal) {
  const response = await registryFetch(name, registryUrl(name), {
    method: "HEAD",
    headers: { Accept: ABBREVIATED_PACKUMENT },
    signal: withTimeout(signal),
    ...getUpstreamFetchInit(REGISTRY_REVALIDATE_SECONDS),
  });
  if (response.status === 404) return false;
  if (!response.ok) throw upstreamError(name, response.status);
  return true;
}

export async function fetchLatestManifest(name: string, signal?: AbortSignal) {
  const response = await registryFetch(name, registryUrl(name, "/latest"), {
    signal: withTimeout(signal),
    ...getUpstreamFetchInit(REGISTRY_REVALIDATE_SECONDS),
  });
  return readDocument(name, response, LatestManifestSchema);
}

export async function fetchPackument(name: string, signal?: AbortSignal) {
  const response = await registryFetch(name, registryUrl(name), {
    signal: withTimeout(signal),
    cache: "no-store",
  });
  return readDocument(name, response, PackumentSchema);
}
