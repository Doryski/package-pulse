import { GithubRepoInfoSchema } from "@/lib/schemas/githubRepoInfo.schema";
import { NPMPackageInfoSchema } from "@/lib/schemas/npmPackageInfo.schema";
import safeParse from "@/lib/utils/safeParse";
import { z } from "zod";

const AnyObjectSchema = z.record(z.string(), z.any());
const AnyArraySchema = z.array(AnyObjectSchema);

export const fetchGithubRepoInfo = async (repoName: string) => {
  const response = await fetch(`https://api.github.com/repos/${repoName}`);
  const data = await response.json();
  return safeParse(data, GithubRepoInfoSchema);
};

export const getRepoNameFromUrl = (gitUrl: string) => {
  return gitUrl
    .replace("git+", "")
    .replace(".git", "")
    .replace("https://github.com/", "");
};

export const fetchPackageInfo = async (projectName: string) => {
  try {
    const response = await fetch(`https://registry.npmjs.org/${projectName}`);
    const data = await response.json();
    const parsedData = safeParse(data, NPMPackageInfoSchema);
    const repositoryUrl = parsedData.repository?.url;

    const latestDistTag = parsedData["dist-tags"]?.latest;
    const latestVersion = latestDistTag
      ? parsedData.versions?.[latestDistTag]
      : null;
    const lastReleaseDate = parsedData.time?.modified;
    const contributorsCount = parsedData.users
      ? Object.keys(parsedData.users).length
      : 0;
    const dependenciesCount = latestVersion?.dependencies
      ? Object.keys(latestVersion.dependencies).length
      : null;
    const devDependenciesCount = latestVersion?.devDependencies
      ? Object.keys(latestVersion.devDependencies).length
      : null;
    const homepage = parsedData.homepage;
    const license = parsedData.license;
    const description = parsedData.description;
    const createdAt = parsedData.time?.created;
    const repoName = repositoryUrl ? getRepoNameFromUrl(repositoryUrl) : null;
    const versions = parsedData.versions
      ? Object.entries(parsedData.versions)
          .reduce<Array<{ version: string; date: string }>>(
            (acc, [version, _]) => {
              if (!/^\d+\.\d+\.\d+$/.test(version)) return acc;
              const date = parsedData.time?.[version];
              if (!date) return acc;
              return [...acc, { version, date }];
            },
            [],
          )
          .toSorted(
            (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
          )
      : [];

    const keywords = parsedData.keywords ?? latestVersion?.keywords;

    return {
      projectName,
      repoName,
      keywords,
      latestVersion,
      lastReleaseDate,
      contributorsCount,
      dependenciesCount,
      devDependenciesCount,
      homepage,
      license,
      repositoryUrl,
      description,
      createdAt,
      versions,
    };
  } catch (error) {
    console.error(error);
    throw error;
  }
};

export type PackageInfo = Awaited<ReturnType<typeof fetchPackageInfo>>;

export const fetchContributorsCount = async (repoName: string) => {
  const response = await fetch(
    `https://api.github.com/repos/${repoName}/contributors`,
  );
  const data = await response.json();
  return safeParse(data, AnyArraySchema).length;
};

export const fetchGithubPullRequestsCount = async (repoName: string) => {
  const response = await fetch(
    `https://api.github.com/repos/${repoName}/pulls`,
  );
  const data = await response.json();
  return safeParse(data, AnyArraySchema).length;
};
