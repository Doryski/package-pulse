const SEGMENT = String.raw`[\w.-]+`;
const REPO = String.raw`([\w.-]+?)(?:\.git)?\/?(?:[/#?].*)?`;

const GITHUB_URL_PATTERN = new RegExp(
  String.raw`^(?:(?:git\+)?(?:https?|ssh|git):\/\/)?(?:[^@/\s]+@)?(?:www\.)?github\.com[/:](${SEGMENT})\/${REPO}$`,
  "i",
);

const SHORTHAND_PATTERN = new RegExp(
  String.raw`^(?:github:)?(${SEGMENT})\/${REPO}$`,
  "i",
);

const toRepoName = (match: RegExpMatchArray | null) => {
  if (!match) return null;
  const [, owner, repo] = match;
  if (!owner || !repo) return null;
  return `${owner}/${repo}`;
};

export default function getRepoNameFromUrl(gitUrl: string) {
  const url = gitUrl.trim();
  if (!url) return null;
  return (
    toRepoName(url.match(GITHUB_URL_PATTERN)) ??
    toRepoName(url.match(SHORTHAND_PATTERN))
  );
}
