import * as Sentry from "@sentry/nextjs";

type CaptureExceptionOptions = Parameters<typeof Sentry.captureException>[1];
type CaptureMessageOptions = Parameters<typeof Sentry.captureMessage>[1];

const ALLOWED_SEARCH_PARAM_KEYS = ["projects", "period", "scale"] as const;

function pickAllowedSearchParams(
  searchParams: URLSearchParams,
): Record<string, string> {
  const params: Record<string, string> = {};

  for (const key of ALLOWED_SEARCH_PARAM_KEYS) {
    const value = searchParams.get(key);
    if (value !== null) params[key] = value;
  }

  return params;
}

export function getSearchParamsContext(): Record<string, unknown> {
  if (typeof window === "undefined") return {};

  try {
    const searchParams = new URLSearchParams(window.location.search);

    return {
      searchParams: pickAllowedSearchParams(searchParams),
      pathname: window.location.pathname,
    };
  } catch (error) {
    console.warn("Failed to extract search params for Sentry context:", error);
    return {};
  }
}

export function scrubRequestUrl<TEvent extends Sentry.ErrorEvent>(
  event: TEvent,
): TEvent {
  const request = event.request;
  if (!request) return event;

  if (request.query_string) request.query_string = undefined;

  if (typeof request.url !== "string") return event;

  try {
    const urlObj = new URL(request.url);
    request.url = `${urlObj.origin}${urlObj.pathname}`;
  } catch (error) {
    console.warn("Failed to scrub request URL for Sentry event:", error);
  }

  return event;
}

export function getSearchParamsContextFromUrl(
  url: string,
): Record<string, unknown> {
  try {
    const urlObj = new URL(url);

    return {
      searchParams: pickAllowedSearchParams(urlObj.searchParams),
      pathname: urlObj.pathname,
    };
  } catch (error) {
    console.warn(
      "Failed to extract search params from URL for Sentry context:",
      error,
    );
    return {};
  }
}

export function setSentrySearchParamsContext(
  context?: Record<string, unknown>,
) {
  const searchParamsContext = context || getSearchParamsContext();

  Sentry.withScope((scope) => {
    scope.setContext("searchParams", searchParamsContext);
  });
}

export function captureExceptionWithSearchParams(
  exception: unknown,
  options?: CaptureExceptionOptions,
) {
  return Sentry.withScope((scope) => {
    scope.setContext("searchParams", getSearchParamsContext());
    return Sentry.captureException(exception, options);
  });
}

export function captureMessageWithSearchParams(
  message: string,
  options?: CaptureMessageOptions,
) {
  return Sentry.withScope((scope) => {
    scope.setContext("searchParams", getSearchParamsContext());
    return Sentry.captureMessage(message, options);
  });
}
