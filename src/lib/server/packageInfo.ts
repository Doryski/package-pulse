import "server-only";
import { cacheDerived } from "@/lib/config/serverCache";
import { fetchPackument } from "@/lib/server/npmRegistry";
import {
  PackumentInfoSchema,
  VersionDependenciesSchema,
  type PackumentInfo,
} from "@/lib/server/packumentInfo.schema";
import getRepoNameFromUrl from "@/lib/utils/getRepoNameFromUrl";
import safeParse from "@/lib/utils/safeParse";

export const PACKAGE_INFO_REVALIDATE_SECONDS = 3600;

const STABLE_VERSION_PATTERN = /^\d+\.\d+\.\d+$/;

type Release = { version: string; date: string };

const countKeys = (record: Record<string, unknown> | undefined) => {
  if (!record) return null;
  return Object.keys(record).length;
};

const toRepositoryUrl = (repository: PackumentInfo["repository"]) => {
  if (!repository) return null;
  if (typeof repository === "string") return repository;
  return repository.url;
};

const toLicense = (license: PackumentInfo["license"]) => {
  if (!license) return null;
  if (typeof license === "string") return license;
  if (Array.isArray(license)) return license.join(", ");
  return license.type;
};

const isLaterRelease = (candidate: Release, current: Release | null) =>
  !current || Date.parse(candidate.date) >= Date.parse(current.date);

const isStableRelease =
  (versions: Record<string, unknown>) =>
  ([version]: [string, string]) =>
    STABLE_VERSION_PATTERN.test(version) && version in versions;

export const getLatestStableRelease = ({ versions, time }: PackumentInfo) => {
  if (!versions || !time) return null;
  return Object.entries(time)
    .filter(isStableRelease(versions))
    .reduce<Release | null>((latest, [version, date]) => {
      const release = { version, date };
      return isLaterRelease(release, latest) ? release : latest;
    }, null);
};

const getLatestVersionDependencies = ({
  versions,
  "dist-tags": distTags,
}: PackumentInfo) => {
  const latest = distTags?.latest;
  const manifest = latest ? versions?.[latest] : undefined;
  if (!manifest) return undefined;
  return safeParse(manifest, VersionDependenciesSchema);
};

export const toPackageInfo = (name: string, packument: PackumentInfo) => {
  const repositoryUrl = toRepositoryUrl(packument.repository);
  const latestManifest = getLatestVersionDependencies(packument);
  return {
    projectName: name,
    repoName: repositoryUrl ? getRepoNameFromUrl(repositoryUrl) : null,
    repositoryUrl,
    homepage: packument.homepage ?? null,
    description: packument.description ?? null,
    license: toLicense(packument.license),
    createdAt: packument.time?.created ?? null,
    lastReleaseDate: packument.time?.modified ?? null,
    latestVersion: packument["dist-tags"]?.latest ?? null,
    dependenciesCount: countKeys(latestManifest?.dependencies),
    devDependenciesCount: countKeys(latestManifest?.devDependencies),
    contributorsCount: countKeys(packument.users) ?? 0,
    latestRelease: getLatestStableRelease(packument),
  };
};

export type PackageInfo = ReturnType<typeof toPackageInfo>;

const loadPackageInfo = async (name: string) => {
  const packument = await fetchPackument(name);
  if (!packument) return null;
  return toPackageInfo(name, safeParse(packument, PackumentInfoSchema));
};

export const getPackageInfo = (name: string) =>
  cacheDerived(() => loadPackageInfo(name), ["package-info", name], {
    revalidate: PACKAGE_INFO_REVALIDATE_SECONDS,
    tags: [`package-info:${name}`],
  })();
