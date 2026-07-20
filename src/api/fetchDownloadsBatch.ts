import { NPMDownloadCount } from "@/lib/schemas/npmDownloadsPeriod.schema";
import AppError from "@/lib/utils/AppError";
import { z } from "zod";

const DownloadsResponseSchema = z.object({
  data: z.record(
    z.string(),
    z.array(z.object({ date: z.string(), count: z.number() })).nullable(),
  ),
  errors: z.record(z.string(), z.string()).optional().default({}),
});

export type DownloadsBatchResult = {
  data: Record<string, NPMDownloadCount[]>;
  errors: Record<string, string>;
};

const inFlightRequests = new Map<string, Promise<DownloadsBatchResult>>();

async function requestDownloadsBatch(
  packages: string[],
): Promise<DownloadsBatchResult> {
  const res = await fetch(
    `/api/downloads?packages=${encodeURIComponent(packages.join(","))}`,
  );

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new AppError(body?.error || "Failed to fetch NPM download data");
  }

  const { data, errors } = DownloadsResponseSchema.parse(await res.json());

  const filtered = Object.entries(data).reduce<
    Record<string, NPMDownloadCount[]>
  >((acc, [packageName, downloads]) => {
    if (downloads) acc[packageName] = downloads;
    return acc;
  }, {});

  return { data: filtered, errors };
}

export default function fetchDownloadsBatch(
  packages: string[],
): Promise<DownloadsBatchResult> {
  const cacheKey = [...packages].sort().join(",");

  const cached = inFlightRequests.get(cacheKey);
  if (cached) return cached;

  const request = requestDownloadsBatch(packages).finally(() => {
    inFlightRequests.delete(cacheKey);
  });

  inFlightRequests.set(cacheKey, request);
  return request;
}
