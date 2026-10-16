import "server-only";
import { cacheDerived } from "@/lib/config/serverCache";
import { fetchLatestManifest } from "@/lib/server/npmRegistry";

export const LATEST_VERSION_REVALIDATE_SECONDS = 3600;

const loadLatestVersion = async (name: string) => {
  const manifest = await fetchLatestManifest(name);
  return manifest?.version ?? null;
};

export const resolveLatestVersion = cacheDerived(
  loadLatestVersion,
  ["latest-version"],
  { revalidate: LATEST_VERSION_REVALIDATE_SECONDS },
);
