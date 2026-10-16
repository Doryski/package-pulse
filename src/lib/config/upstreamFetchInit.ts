import { env } from "@/lib/config/env";

export function getUpstreamFetchInit(revalidateSeconds: number) {
  if (env.PP_E2E_TEST_PROXY) return { cache: "no-store" } as const;
  return { next: { revalidate: revalidateSeconds } } as const;
}
