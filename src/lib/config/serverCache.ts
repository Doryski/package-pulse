import { env } from "@/lib/config/env";
import { unstable_cache } from "next/cache";

type CacheDerivedOptions = {
  revalidate: number | false;
  tags?: string[];
};

type CachedCallback = Parameters<typeof unstable_cache>[0];

export function cacheDerived<T extends CachedCallback>(
  fn: T,
  keyParts: string[],
  { revalidate, tags }: CacheDerivedOptions,
): T {
  if (env.PP_E2E_TEST_PROXY) return fn;
  return unstable_cache(fn, keyParts, { revalidate, tags });
}
