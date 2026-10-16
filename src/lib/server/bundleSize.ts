import "server-only";
import { cacheDerived } from "@/lib/config/serverCache";
import { resolveLatestVersion } from "@/lib/server/latestVersion";
import {
  failed,
  found,
  missing,
  type PackageOutcome,
  toPackageResults,
} from "@/lib/server/packageResults";
import { upstreamFetch, upstreamStatusError } from "@/lib/server/upstreamFetch";
import isValidPackageName from "@/lib/utils/isValidPackageName";
import { mapWithConcurrency } from "@/lib/utils/mapWithConcurrency";
import { z } from "zod";

export const BUNDLEPHOBIA_SIZE_URL = "https://bundlephobia.com/api/size";
export const BUNDLE_SIZE_CONCURRENCY = 2;
export const BUNDLE_SIZE_REVALIDATE_SECONDS = 7 * 24 * 60 * 60;

const VERSION_PATTERN = /^[0-9a-z][0-9a-z.+-]*$/i;

const BundlephobiaSizeSchema = z
  .object({
    size: z.number().optional().catch(undefined),
    gzip: z.number().optional().catch(undefined),
    dependencyCount: z.number().optional().catch(undefined),
    hasJSModule: z.boolean().optional().catch(undefined),
    hasSideEffects: z.boolean().optional().catch(undefined),
  })
  .catch({});

type BundlephobiaSize = z.output<typeof BundlephobiaSizeSchema>;

export type BundleSize = ReturnType<typeof toBundleSize>;

export const parsePackageSpec = (spec: string) => {
  const at = spec.lastIndexOf("@");
  if (at <= 0) return { name: spec, version: undefined };
  return { name: spec.slice(0, at), version: spec.slice(at + 1) };
};

export const isValidPackageSpec = (spec: string) => {
  const { name, version } = parsePackageSpec(spec);
  if (!isValidPackageName(name)) return false;
  return version === undefined || VERSION_PATTERN.test(version);
};

const toBundleSize = (version: string, parsed: BundlephobiaSize) => ({
  version,
  size: parsed.size ?? null,
  gzip: parsed.gzip ?? null,
  dependencyCount: parsed.dependencyCount ?? null,
  treeShakeable: parsed.hasJSModule === true && parsed.hasSideEffects === false,
});

const bundlephobiaUrl = (name: string, version: string) =>
  `${BUNDLEPHOBIA_SIZE_URL}?package=${encodeURIComponent(`${name}@${version}`)}`;

const loadBundleSize = async (name: string, version: string) => {
  const label = `Bundlephobia request for "${name}@${version}"`;
  const response = await upstreamFetch(label, bundlephobiaUrl(name, version));
  if (response.status === 404) return null;
  if (!response.ok) throw upstreamStatusError(label, response.status);
  const parsed = BundlephobiaSizeSchema.parse(await response.json());
  return toBundleSize(version, parsed);
};

const cachedBundleSize = cacheDerived(loadBundleSize, ["bundle-size"], {
  revalidate: BUNDLE_SIZE_REVALIDATE_SECONDS,
});

const resolveVersion = async (name: string, version: string | undefined) =>
  version ?? resolveLatestVersion(name);

const loadSpec = async (spec: string): Promise<PackageOutcome<BundleSize>> => {
  const { name, version } = parsePackageSpec(spec);
  try {
    const resolved = await resolveVersion(name, version);
    if (!resolved) return missing(name);
    const bundleSize = await cachedBundleSize(name, resolved);
    if (!bundleSize) return missing(name);
    return found(name, bundleSize);
  } catch (error) {
    console.error(`Failed to load bundle size for "${spec}":`, error);
    return failed(name);
  }
};

export async function getBundleSizes(specs: readonly string[]) {
  const outcomes = await mapWithConcurrency(
    specs,
    BUNDLE_SIZE_CONCURRENCY,
    loadSpec,
  );
  return toPackageResults(outcomes);
}
