export const getProjectStatsQueryKey = (projectName: string) =>
  ["project-stats", projectName] as const;

export const normalizeSearchTerm = (search: string) =>
  search.trim().toLowerCase();

export const getSearchNPMRegistryQueryKey = (search: string) =>
  ["projects-suggestions", normalizeSearchTerm(search)] as const;

export const getPackageInfoQueryKey = (projectName: string) =>
  ["package-info", projectName] as const;

export const getBundleSizeQueryKey = (
  projectName: string,
  version: string | null,
) => ["bundle-size", projectName, version] as const;

export const getDepsDevQueryKey = (projectName: string) =>
  ["deps-dev", projectName] as const;

export const getGithubRepoInfoQueryKey = (repoName: string | null) =>
  ["github-repo-info", repoName] as const;

export const getGithubPullRequestsCountQueryKey = (repoName: string | null) =>
  ["github-pull-requests-count", repoName] as const;

export const getGithubContributorsCountQueryKey = (repoName: string | null) =>
  ["github-contributors-count", repoName] as const;
