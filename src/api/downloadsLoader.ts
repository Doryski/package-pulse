import AppError from "@/lib/utils/AppError";
import createBatchLoader from "@/lib/utils/createBatchLoader";
import type { CompactSeries } from "@/lib/utils/compactSeries";
import * as z from "zod/mini";

export const DOWNLOADS_ERROR_MESSAGE = "Failed to fetch NPM download data";

const HTTP_STATUS = { notFound: 404, badGateway: 502 } as const;

const CompactSeriesSchema = z.object({
  start: z.string(),
  counts: z.array(z.nullable(z.number())),
});

const DownloadsResponseSchema = z.object({
  data: z.record(z.string(), z.nullable(CompactSeriesSchema)),
  errors: z._default(z.record(z.string(), z.string()), {}),
});

const ErrorBodySchema = z.object({ error: z.string() });

type DownloadsResponse = z.infer<typeof DownloadsResponseSchema>;

export type DownloadsEntry = {
  series: CompactSeries;
  warning: string | undefined;
};

export const notFoundMessage = (name: string) => `Package "${name}" not found`;

export const buildDownloadsUrl = (packages: string[]) =>
  `/api/downloads?v=2&packages=${encodeURIComponent(packages.toSorted().join(","))}`;

const readErrorMessage = async (response: Response) => {
  const body = await response.json().catch(() => null);
  const parsed = ErrorBodySchema.safeParse(body);
  return parsed.success && parsed.data.error
    ? parsed.data.error
    : DOWNLOADS_ERROR_MESSAGE;
};

const toMissingError = (name: string, error: string | undefined) => {
  if (!error || error === notFoundMessage(name)) {
    return new AppError(notFoundMessage(name), {
      status: HTTP_STATUS.notFound,
    });
  }
  return new AppError(error, { status: HTTP_STATUS.badGateway });
};

export const readDownloadsEntry =
  ({ data, errors }: DownloadsResponse) =>
  (name: string): DownloadsEntry => {
    const series = data[name];
    if (!series) throw toMissingError(name, errors[name]);
    return { series, warning: errors[name] };
  };

const parseDownloadsResponse = (body: unknown) => {
  const parsed = DownloadsResponseSchema.safeParse(body);
  if (!parsed.success) {
    throw new AppError(DOWNLOADS_ERROR_MESSAGE, {
      status: HTTP_STATUS.badGateway,
    });
  }
  return parsed.data;
};

export async function fetchDownloadsBatch(
  packages: string[],
  signal: AbortSignal,
) {
  const response = await fetch(buildDownloadsUrl(packages), { signal });
  if (!response.ok) {
    throw new AppError(await readErrorMessage(response), {
      status: response.status,
    });
  }
  return readDownloadsEntry(parseDownloadsResponse(await response.json()));
}

const downloadsLoader = createBatchLoader({ loadBatch: fetchDownloadsBatch });

export default function loadDownloads(name: string, signal?: AbortSignal) {
  return downloadsLoader.load(name, signal);
}
