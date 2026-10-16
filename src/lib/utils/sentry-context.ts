import * as Sentry from "@sentry/nextjs";

type CaptureExceptionOptions = Parameters<typeof Sentry.captureException>[1];
type SentryOptions = Parameters<typeof Sentry.init>[0];
type DataCollection = NonNullable<SentryOptions["dataCollection"]>;
type StreamedSpan = Parameters<NonNullable<SentryOptions["beforeSendSpan"]>>[0];

const ALLOWED_SEARCH_PARAM_KEYS = [
  "projects",
  "period",
  "scale",
  "mode",
] as const;

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

export const SENTRY_TRACES_SAMPLE_RATE =
  process.env.NODE_ENV === "production" ? 0.1 : 1;

const BREADCRUMB_URL_KEYS = ["url", "to", "from"] as const;

const stripTextQuery = (text: string) => text.split(/[?#]/)[0] ?? text;

const stripQuery = (raw: string) => {
  try {
    const url = new URL(raw, "http://localhost");
    const isRelative = !/^[a-z][a-z\d+.-]*:/i.test(raw);
    return isRelative ? url.pathname : `${url.origin}${url.pathname}`;
  } catch {
    return stripTextQuery(raw);
  }
};

export function scrubBreadcrumb(
  breadcrumb: Sentry.Breadcrumb,
): Sentry.Breadcrumb {
  const data = breadcrumb.data;
  if (!data) return breadcrumb;

  const scrubbed = Object.fromEntries(
    BREADCRUMB_URL_KEYS.filter((key) => typeof data[key] === "string").map(
      (key) => [key, stripQuery(data[key])],
    ),
  );

  return { ...breadcrumb, data: { ...data, ...scrubbed } };
}

export function scrubRequestUrl<TEvent extends Sentry.Event>(
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

export const SENTRY_DSN =
  "https://1e370265741031c93d8e072603c36fe3@o4509277242458112.ingest.de.sentry.io/4509277245145168";

export const SENTRY_DATA_COLLECTION = {
  userInfo: false,
  cookies: false,
  httpHeaders: false,
  httpBodies: [],
  urlQueryParams: false,
  graphQL: { document: false, variables: false },
  genAI: { inputs: false, outputs: false },
  databaseQueryData: false,
  queues: false,
  stackFrameVariables: false,
} as const satisfies DataCollection;

const SPAN_URL_ATTRIBUTE_KEYS = [
  "url.full",
  "http.url",
  "http.target",
  "url",
] as const;

const SPAN_QUERY_ATTRIBUTE_KEYS = [
  "url.query",
  "http.query",
  "url.fragment",
  "http.fragment",
] as const;

type SpanAttributes = StreamedSpan["attributes"];

const isAttributeObject = (
  value: unknown,
): value is { value: unknown; unit?: unknown } =>
  typeof value === "object" && value !== null && "value" in value;

const scrubAttributeValue = (value: unknown): unknown => {
  if (typeof value === "string") return stripQuery(value);
  if (isAttributeObject(value) && typeof value.value === "string") {
    return { ...value, value: stripQuery(value.value) };
  }
  return value;
};

const scrubSpanAttributes = (attributes: SpanAttributes): SpanAttributes => {
  const withoutQuery = Object.fromEntries(
    Object.entries(attributes).filter(
      ([key]) =>
        !SPAN_QUERY_ATTRIBUTE_KEYS.some((queryKey) => queryKey === key),
    ),
  );

  const scrubbedUrls = Object.fromEntries(
    SPAN_URL_ATTRIBUTE_KEYS.filter((key) => key in withoutQuery).map((key) => [
      key,
      scrubAttributeValue(withoutQuery[key]),
    ]),
  );

  return { ...withoutQuery, ...scrubbedUrls };
};

export function scrubSpan(span: StreamedSpan): StreamedSpan {
  return {
    ...span,
    name: stripTextQuery(span.name),
    attributes: scrubSpanAttributes(span.attributes),
  };
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

const getEventUrl = (event: Sentry.ErrorEvent) => {
  const url =
    event.request?.url || event.contexts?.trace?.data?.url || event.tags?.url;
  return typeof url === "string" ? url : undefined;
};

export function withServerSearchParamsContext(
  event: Sentry.ErrorEvent,
): Sentry.ErrorEvent {
  const url = getEventUrl(event);
  if (!url) return event;

  return {
    ...event,
    contexts: {
      ...event.contexts,
      searchParams: getSearchParamsContextFromUrl(url),
    },
  };
}

export const SENTRY_SHARED_OPTIONS = {
  dsn: SENTRY_DSN,
  tracesSampleRate: SENTRY_TRACES_SAMPLE_RATE,
  debug: false,
  dataCollection: SENTRY_DATA_COLLECTION,
  beforeBreadcrumb: scrubBreadcrumb,
  beforeSendSpan: scrubSpan,
} satisfies SentryOptions;

export const SENTRY_SERVER_OPTIONS = {
  ...SENTRY_SHARED_OPTIONS,
  beforeSend: (event) => scrubRequestUrl(withServerSearchParamsContext(event)),
} satisfies SentryOptions;

export function captureExceptionWithSearchParams(
  exception: unknown,
  options?: CaptureExceptionOptions,
) {
  return Sentry.withScope((scope) => {
    scope.setContext("searchParams", getSearchParamsContext());
    return Sentry.captureException(exception, options);
  });
}
