const MOCK_OWNER = "e2e";
const DAY_MS = 24 * 60 * 60 * 1000;
const UINT32_RANGE = 4_294_967_296;

const MOCK_VERSIONS = [
  { version: "1.0.0", date: "2020-01-15T10:00:00.000Z" },
  { version: "1.1.0", date: "2022-06-01T10:00:00.000Z" },
  { version: "2.0.0", date: "2024-03-10T10:00:00.000Z" },
] as const;

const [FIRST_RELEASE, , LATEST_RELEASE] = MOCK_VERSIONS;
const LATEST_VERSION = LATEST_RELEASE.version;

export const MOCK_DEFAULT_SIMILAR = [
  "e2e-similar-alpha",
  "e2e-similar-beta",
  "e2e-similar-gamma",
] as const;

export const hashString = (value: string) => {
  let hash = 0x811c9dc5;
  for (const char of value) {
    hash ^= char.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
};

export const mulberry32 = (seed: number) => {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / UINT32_RANGE;
  };
};

const seededInt = (seed: string, min: number, max: number) =>
  min + Math.floor(mulberry32(hashString(seed))() * (max - min + 1));

const packageBase = (pkg: string) => seededInt(`base:${pkg}`, 5_000, 500_000);

export const seededDownloads = (pkg: string, day: string) =>
  Math.round(
    packageBase(pkg) * (0.5 + mulberry32(hashString(`${pkg}|${day}`))()),
  );

export const isMissingPackage = (name: string) => name.startsWith("missing-");

export const toRepoSlug = (name: string) =>
  name.replace(/^@/, "").replaceAll("/", "-");

export const toRepoName = (name: string) => `${MOCK_OWNER}/${toRepoSlug(name)}`;

const toUtcDay = (date: Date) => date.toISOString().slice(0, 10);

export const eachDay = (start: string, end: string) => {
  const first = Date.parse(`${start}T00:00:00.000Z`);
  const last = Date.parse(`${end}T00:00:00.000Z`);
  const count = Math.max(0, Math.floor((last - first) / DAY_MS) + 1);
  return Array.from({ length: count }, (_, index) =>
    toUtcDay(new Date(first + index * DAY_MS)),
  );
};

export const buildRangePeriod = (pkg: string, start: string, end: string) => ({
  downloads: eachDay(start, end).map((day) => ({
    day,
    downloads: seededDownloads(pkg, day),
  })),
  start,
  end,
  package: pkg,
});

export const buildBulkRange = (
  packages: readonly string[],
  start: string,
  end: string,
  isMissing: (name: string) => boolean = isMissingPackage,
) =>
  Object.fromEntries(
    packages.map((pkg) => [
      pkg,
      isMissing(pkg) ? null : buildRangePeriod(pkg, start, end),
    ]),
  );

export const buildRangeNotFound = (pkg: string) => ({
  error: `package ${pkg} not found`,
});

const buildVersionDoc = (name: string, version: string) => ({
  _id: `${name}@${version}`,
  name,
  version,
  description: `Mock package ${name}`,
  keywords: ["e2e", toRepoSlug(name)],
  license: "MIT",
  homepage: `https://example.com/${toRepoSlug(name)}`,
  repository: {
    type: "git",
    url: `git+https://github.com/${toRepoName(name)}.git`,
  },
  dependencies: { "e2e-dep-a": "^1.0.0", "e2e-dep-b": "^2.0.0" },
  devDependencies: { "e2e-dev-a": "^1.0.0" },
  dist: {
    shasum: hashString(`${name}@${version}`).toString(16).padStart(8, "0"),
    tarball: `https://registry.npmjs.org/${name}/-/${toRepoSlug(name)}-${version}.tgz`,
  },
});

export const buildPackageDoc = (name: string) => ({
  _id: name,
  name,
  description: `Mock package ${name}`,
  keywords: ["e2e", toRepoSlug(name)],
  "dist-tags": { latest: LATEST_VERSION },
  versions: Object.fromEntries(
    MOCK_VERSIONS.map(({ version }) => [
      version,
      buildVersionDoc(name, version),
    ]),
  ),
  time: {
    created: FIRST_RELEASE.date,
    modified: LATEST_RELEASE.date,
    ...Object.fromEntries(
      MOCK_VERSIONS.map(({ version, date }) => [version, date]),
    ),
  },
  homepage: `https://example.com/${toRepoSlug(name)}`,
  repository: {
    type: "git",
    url: `git+https://github.com/${toRepoName(name)}.git`,
  },
  license: "MIT",
  maintainers: [{ name: MOCK_OWNER, email: "e2e@example.com" }],
  users: { alice: true, bob: true },
});

const buildSearchItem = (name: string) => ({
  package: {
    name,
    version: LATEST_VERSION,
    description: `Mock package ${name}`,
    keywords: ["e2e"],
    date: LATEST_RELEASE.date,
    links: {
      npm: `https://www.npmjs.com/package/${name}`,
      repository: `https://github.com/${toRepoName(name)}`,
    },
    maintainers: [{ username: MOCK_OWNER, email: "e2e@example.com" }],
  },
  score: {
    final: 0.9,
    detail: { quality: 0.9, popularity: 0.9, maintenance: 0.9 },
  },
  searchScore: 100,
});

export const searchResultNames = (text: string) => {
  const term = text.trim().toLowerCase();
  if (!term || isMissingPackage(term)) return [];
  return [term, `${term}-utils`, `${term}-plugin`];
};

export const buildSearchResults = (text: string) => {
  const names = searchResultNames(text);
  return {
    objects: names.map(buildSearchItem),
    total: names.length,
    time: LATEST_RELEASE.date,
  };
};

export const buildBundleSize = (name: string) => ({
  size: seededInt(`size:${name}`, 2_000, 400_000),
  gzip: seededInt(`gzip:${name}`, 1_000, 120_000),
  dependencyCount: seededInt(`deps:${name}`, 0, 12),
  hasJSModule: true,
  hasSideEffects: false,
});

export const buildDepsDevVersion = (name: string) => ({
  licenses: ["MIT"],
  advisoryKeys: [],
  relatedProjects: [
    {
      projectKey: { id: `github.com/${toRepoName(name)}` },
      relationType: "SOURCE_REPO",
    },
  ],
});

export const buildDepsDevProject = (projectId: string) => ({
  openIssuesCount: seededInt(`issues:${projectId}`, 0, 500),
  starsCount: seededInt(`stars:${projectId}`, 10, 200_000),
  forksCount: seededInt(`forks:${projectId}`, 1, 40_000),
  scorecard: { overallScore: seededInt(`score:${projectId}`, 30, 95) / 10 },
});

const USER_URL_KEYS = [
  "url",
  "html_url",
  "followers_url",
  "following_url",
  "gists_url",
  "starred_url",
  "subscriptions_url",
  "organizations_url",
  "repos_url",
  "events_url",
  "received_events_url",
] as const;

const REPO_URL_KEYS = [
  "url",
  "forks_url",
  "keys_url",
  "collaborators_url",
  "teams_url",
  "hooks_url",
  "issue_events_url",
  "events_url",
  "assignees_url",
  "branches_url",
  "tags_url",
  "blobs_url",
  "git_tags_url",
  "git_refs_url",
  "trees_url",
  "statuses_url",
  "languages_url",
  "stargazers_url",
  "contributors_url",
  "subscribers_url",
  "subscription_url",
  "commits_url",
  "git_commits_url",
  "comments_url",
  "issue_comment_url",
  "contents_url",
  "compare_url",
  "merges_url",
  "archive_url",
  "downloads_url",
  "issues_url",
  "pulls_url",
  "milestones_url",
  "notifications_url",
  "labels_url",
  "releases_url",
  "deployments_url",
] as const;

const urlFields = (keys: readonly string[], base: string) =>
  Object.fromEntries(keys.map((key) => [key, `${base}/${key}`]));

const buildGithubUser = (login: string) => ({
  login,
  id: hashString(login),
  node_id: `node-${login}`,
  avatar_url: `https://avatars.example.com/${login}`,
  gravatar_id: "",
  ...urlFields(USER_URL_KEYS, `https://api.github.com/users/${login}`),
  type: "Organization",
  site_admin: false,
});

export const buildGithubRepo = (repoName: string) => {
  const [owner = MOCK_OWNER, name = repoName] = repoName.split("/");
  const stars = seededInt(`stars:${repoName}`, 10, 200_000);
  const forks = seededInt(`forks:${repoName}`, 1, 40_000);
  const issues = seededInt(`issues:${repoName}`, 0, 500);
  return {
    id: hashString(repoName),
    node_id: `node-${repoName}`,
    name,
    full_name: repoName,
    private: false,
    owner: buildGithubUser(owner),
    html_url: `https://github.com/${repoName}`,
    description: `Mock repository ${repoName}`,
    fork: false,
    ...urlFields(REPO_URL_KEYS, `https://api.github.com/repos/${repoName}`),
    created_at: FIRST_RELEASE.date,
    updated_at: LATEST_RELEASE.date,
    pushed_at: LATEST_RELEASE.date,
    git_url: `git://github.com/${repoName}.git`,
    ssh_url: `git@github.com:${repoName}.git`,
    clone_url: `https://github.com/${repoName}.git`,
    svn_url: `https://github.com/${repoName}`,
    homepage: `https://example.com/${name}`,
    size: seededInt(`size:${repoName}`, 100, 100_000),
    stargazers_count: stars,
    watchers_count: stars,
    language: "TypeScript",
    has_issues: true,
    has_projects: true,
    has_downloads: true,
    has_wiki: false,
    has_pages: false,
    has_discussions: false,
    forks_count: forks,
    mirror_url: null,
    archived: false,
    disabled: false,
    open_issues_count: issues,
    license: {
      key: "mit",
      name: "MIT License",
      spdx_id: "MIT",
      url: "https://api.github.com/licenses/mit",
      node_id: "node-mit",
    },
    allow_forking: true,
    is_template: false,
    web_commit_signoff_required: false,
    topics: ["e2e"],
    visibility: "public",
    forks,
    open_issues: issues,
    watchers: stars,
    default_branch: "main",
    temp_clone_token: null,
    custom_properties: {},
    organization: buildGithubUser(owner),
    network_count: forks,
    subscribers_count: seededInt(`subs:${repoName}`, 1, 5_000),
  };
};

export const githubContributorsCount = (repoName: string) =>
  seededInt(`contributors:${repoName}`, 1, 30);

export const githubPullsCount = (repoName: string) =>
  seededInt(`pulls:${repoName}`, 0, 30);

export const buildGithubList = (count: number) =>
  Array.from({ length: count }, (_, index) => ({ id: index + 1 }));

export const buildOpenAiResponse = (similarProjects: readonly string[]) => ({
  id: "resp_e2e",
  object: "response",
  created_at: 1_700_000_000,
  status: "completed",
  model: "gpt-6-luna",
  output: [
    {
      type: "message",
      id: "msg_e2e",
      status: "completed",
      role: "assistant",
      content: [
        {
          type: "output_text",
          text: JSON.stringify({ similarProjects }),
          annotations: [],
        },
      ],
    },
  ],
  usage: {
    input_tokens: 1,
    output_tokens: 1,
    total_tokens: 2,
  },
});
