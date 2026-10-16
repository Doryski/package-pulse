const SAFE_PROTOCOLS = ["http:", "https:"] as const;

const GIT_URL_PREFIXES = [/^git\+/, /\.git$/] as const;

const normalizeGitUrl = (url: string) =>
  GIT_URL_PREFIXES.reduce((acc, pattern) => acc.replace(pattern, ""), url)
    .replace(/^git:\/\//, "https://")
    .replace(/^ssh:\/\/git@/, "https://");

const isSafeProtocol = (protocol: string) =>
  SAFE_PROTOCOLS.some((safe) => safe === protocol);

export default function safeExternalUrl(
  raw: string | null | undefined,
): string | undefined {
  if (!raw) return undefined;
  try {
    const url = new URL(normalizeGitUrl(raw.trim()));
    if (!isSafeProtocol(url.protocol)) return undefined;
    return url.toString();
  } catch {
    return undefined;
  }
}
