import * as Sentry from "@sentry/nextjs";

type CaptureExceptionOptions = Parameters<typeof Sentry.captureException>[1];
type CaptureMessageOptions = Parameters<typeof Sentry.captureMessage>[1];

export function getSearchParamsContext(): Record<string, unknown> {
  if (typeof window === "undefined") return {};

  try {
    const searchParams = new URLSearchParams(window.location.search);
    const params: Record<string, string> = {};

    searchParams.forEach((value, key) => {
      params[key] = value;
    });

    return {
      searchParams: params,
      url: window.location.href,
      pathname: window.location.pathname,
      search: window.location.search,
    };
  } catch (error) {
    console.warn("Failed to extract search params for Sentry context:", error);
    return {};
  }
}

export function getSearchParamsContextFromUrl(
  url: string,
): Record<string, unknown> {
  try {
    const urlObj = new URL(url);
    const params: Record<string, string> = {};

    urlObj.searchParams.forEach((value, key) => {
      params[key] = value;
    });

    return {
      searchParams: params,
      url: url,
      pathname: urlObj.pathname,
      search: urlObj.search,
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
