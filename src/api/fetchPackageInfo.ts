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
    const repositoryUrl = parsedData.repository.url;
    const latestVersion = parsedData.versions[parsedData["dist-tags"].latest];
    const lastReleaseDate = parsedData.time.modified;
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
    const createdAt = parsedData.time.created;
    const repoName = getRepoNameFromUrl(repositoryUrl);

    return {
      projectName,
      repoName,
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
    };
  } catch (error) {
    console.error(error);
    throw error;
  }
};

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
