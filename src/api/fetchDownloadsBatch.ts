import { NPMDownloadCount } from "@/lib/schemas/npmDownloadsPeriod.schema";
import AppError from "@/lib/utils/AppError";
import { z } from "zod";

const BatchDataSchema = z.record(
  z.string(),
  z.array(z.object({ date: z.string(), count: z.number() })).nullable(),
);

const inFlightRequests = new Map<
  string,
  Promise<Record<string, NPMDownloadCount[]>>
>();

async function requestDownloadsBatch(packages: string[]) {
  const res = await fetch(
    `/api/downloads?packages=${encodeURIComponent(packages.join(","))}`,
  );

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new AppError(body?.error || "Failed to fetch NPM download data");
  }

  const { data } = await res.json();
  const parsed = BatchDataSchema.parse(data);

  return Object.entries(parsed).reduce<Record<string, NPMDownloadCount[]>>(
    (acc, [packageName, downloads]) => {
      if (downloads) acc[packageName] = downloads;
      return acc;
    },
    {},
  );
}

export default function fetchDownloadsBatch(
  packages: string[],
): Promise<Record<string, NPMDownloadCount[]>> {
  const cacheKey = [...packages].sort().join(",");

  const cached = inFlightRequests.get(cacheKey);
  if (cached) return cached;

  const request = requestDownloadsBatch(packages).finally(() => {
    inFlightRequests.delete(cacheKey);
  });

  inFlightRequests.set(cacheKey, request);
  return request;
}
