import AppError from "@/lib/utils/AppError";
import { z } from "zod";
import {
  NPMDownloadCount,
  NPMDownloadPeriodSchema,
} from "./npmDownloadsPeriod.schema";

export const NpmBulkRangeResponseSchema = z.record(
  z.string(),
  NPMDownloadPeriodSchema.nullable(),
);

export const NpmRangeErrorSchema = z.object({ error: z.string() });

type NormalizedRangeResponse = Record<
  string,
  { downloads: NPMDownloadCount[] } | null
>;

const hasFlatShape = (
  json: unknown,
): json is Record<string, unknown> & {
  package: string;
  downloads: unknown[];
} =>
  typeof json === "object" &&
  json !== null &&
  typeof (json as Record<string, unknown>).package === "string" &&
  Array.isArray((json as Record<string, unknown>).downloads);

export function normalizeRangeResponse(json: unknown): NormalizedRangeResponse {
  const errorResult = NpmRangeErrorSchema.safeParse(json);
  if (errorResult.success) {
    throw new AppError(errorResult.data.error);
  }

  if (hasFlatShape(json)) {
    const period = NPMDownloadPeriodSchema.parse(json);
    return { [period.package]: { downloads: period.downloads } };
  }

  const map = NpmBulkRangeResponseSchema.parse(json);
  const normalized: NormalizedRangeResponse = {};
  for (const [name, period] of Object.entries(map)) {
    normalized[name] = period ? { downloads: period.downloads } : null;
  }
  return normalized;
}
