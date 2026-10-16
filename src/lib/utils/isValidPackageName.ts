const NPM_NAME_REGEX =
  /^(?:@[a-z0-9-*~][a-z0-9-*._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/;

const MAX_PACKAGE_NAME_LENGTH = 214;

export default function isValidPackageName(name: string): boolean {
  if (!name || typeof name !== "string") return false;
  if (name.length > MAX_PACKAGE_NAME_LENGTH) return false;
  if (name.startsWith(".") || name.startsWith("_")) return false;
  return NPM_NAME_REGEX.test(name.toLowerCase());
}
