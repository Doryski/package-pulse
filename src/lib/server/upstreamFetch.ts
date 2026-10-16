import "server-only";
import AppError from "@/lib/utils/AppError";

export const UPSTREAM_TIMEOUT_MS = 10_000;

const UPSTREAM_FAILURE_STATUS = 502;
const TIMEOUT_STATUS = 504;

const isTimeoutError = (error: unknown) =>
  error instanceof Error && error.name === "TimeoutError";

const toUpstreamError = (label: string, error: unknown) => {
  if (!isTimeoutError(error)) return error;
  return new AppError(`${label} timed out`, { status: TIMEOUT_STATUS });
};

export const upstreamStatusError = (label: string, status: number) =>
  new AppError(`${label} failed: ${status}`, {
    status: UPSTREAM_FAILURE_STATUS,
  });

export async function upstreamFetch(
  label: string,
  url: string,
  init: RequestInit = {},
) {
  try {
    return await fetch(url, {
      cache: "no-store",
      ...init,
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
  } catch (error) {
    throw toUpstreamError(label, error);
  }
}
