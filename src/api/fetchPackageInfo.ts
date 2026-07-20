import { BundlephobiaSchema } from "@/lib/schemas/bundlephobia.schema";
import {
  DepsDevProjectSchema,
  DepsDevVersionSchema,
} from "@/lib/schemas/depsDev.schema";
import { GithubRepoInfoSchema } from "@/lib/schemas/githubRepoInfo.schema";
import { NPMPackageInfoSchema } from "@/lib/schemas/npmPackageInfo.schema";
import {
  bundlephobiaApiQueue,
  depsDevApiQueue,
  githubApiQueue,
  npmApiQueue,
} from "@/lib/utils/requestQueue";
import safeParse from "@/lib/utils/safeParse";
import { z } from "zod";

const AnyObjectSchema = z.record(z.string(), z.unknown());
const AnyArraySchema = z.array(AnyObjectSchema);

export const fetchGithubRepoInfo = async (repoName: string) => {
  return githubApiQueue.add(async () => {
    const response = await fetch(`https://api.github.com/repos/${repoName}`);
    const data = await response.json();
    return safeParse(data, GithubRepoInfoSchema);
  });
};

export const getRepoNameFromUrl = (gitUrl: string) => {
  return gitUrl
    .replace("git+", "")
    .replace(".git", "")
    .replace("https://github.com/", "");
};

const processPackageVersions = (
  versionsData: Record<string, unknown> | undefined,
  timeData: Record<string, string> | undefined,
): Array<{ version: string; date: string }> => {
  if (!versionsData) return [];

  return Object.entries(versionsData)
    .reduce<Array<{ version: string; date: string }>>((acc, [version, _]) => {
      if (!/^\d+\.\d+\.\d+$/.test(version)) return acc;
      const date = timeData?.[version];
      if (!date) return acc;
      return [...acc, { version, date }];
    }, [])
    .toSorted(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );
};

export const fetchPackageInfo = async (projectName: string) => {
  try {
    return await npmApiQueue.add(async () => {
      const response = await fetch(`https://registry.npmjs.org/${projectName}`);
      const data = await response.json();

      const parsedData = safeParse(data, NPMPackageInfoSchema);
      const repositoryUrl =
        typeof parsedData.repository === "string"
          ? parsedData.repository
          : parsedData.repository?.url;

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
      const versions = processPackageVersions(
        parsedData.versions,
        parsedData.time,
      );

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
    });
  } catch (error) {
    console.error(error);
    throw error;
  }
};

export type PackageInfo = Awaited<ReturnType<typeof fetchPackageInfo>>;

export const fetchContributorsCount = async (repoName: string) => {
  return githubApiQueue.add(async () => {
    const response = await fetch(
      `https://api.github.com/repos/${repoName}/contributors`,
    );
    const data = await response.json();
    return safeParse(data, AnyArraySchema).length;
  });
};

export const fetchGithubPullRequestsCount = async (repoName: string) => {
  return githubApiQueue.add(async () => {
    const response = await fetch(
      `https://api.github.com/repos/${repoName}/pulls`,
    );
    const data = await response.json();
    return safeParse(data, AnyArraySchema).length;
  });
};

export const fetchBundleSize = async (name: string, version?: string) => {
  try {
    return await bundlephobiaApiQueue.add(async () => {
      const pkg = version ? `${name}@${version}` : name;
      const response = await fetch(
        `https://bundlephobia.com/api/size?package=${encodeURIComponent(pkg)}`,
      );
      const data = await response.json();
      const parsed = safeParse(data, BundlephobiaSchema);
      const treeShakeable =
        parsed.hasJSModule === true && parsed.hasSideEffects === false;
      return { ...parsed, treeShakeable };
    });
  } catch (error) {
    console.error(error);
    return null;
  }
};

export type BundleSizeResult = Awaited<ReturnType<typeof fetchBundleSize>>;

const getDepsDevGithubProjectId = (
  version: z.infer<typeof DepsDevVersionSchema>,
) => {
  const related = version.relatedProjects?.find((project) =>
    project.projectKey?.id?.startsWith("github.com/"),
  );
  return related?.projectKey?.id;
};

export const fetchDepsDev = async (name: string, version: string) => {
  try {
    const versionData = await depsDevApiQueue.add(async () => {
      const response = await fetch(
        `https://api.deps.dev/v3/systems/npm/packages/${encodeURIComponent(
          name,
        )}/versions/${encodeURIComponent(version)}`,
      );
      const data = await response.json();
      return safeParse(data, DepsDevVersionSchema);
    });

    const vulnerabilityCount = versionData.advisoryKeys?.length;
    const licenses = versionData.licenses;
    const projectId = getDepsDevGithubProjectId(versionData);

    if (!projectId) {
      return {
        vulnerabilityCount,
        licenses,
        healthScore: undefined,
        starsCount: undefined,
        forksCount: undefined,
        openIssuesCount: undefined,
      };
    }

    const projectData = await depsDevApiQueue.add(async () => {
      const response = await fetch(
        `https://api.deps.dev/v3/projects/${encodeURIComponent(projectId)}`,
      );
      const data = await response.json();
      return safeParse(data, DepsDevProjectSchema);
    });

    return {
      vulnerabilityCount,
      licenses,
      healthScore: projectData.scorecard?.overallScore,
      starsCount: projectData.starsCount,
      forksCount: projectData.forksCount,
      openIssuesCount: projectData.openIssuesCount,
    };
  } catch (error) {
    console.error(error);
    return null;
  }
};

export type DepsDevResult = Awaited<ReturnType<typeof fetchDepsDev>>;
