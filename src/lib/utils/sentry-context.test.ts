/**
 * @vitest-environment node
 */
import { afterEach, describe, expect, test, vi } from "vitest";
import {
  SENTRY_DATA_COLLECTION,
  SENTRY_SERVER_OPTIONS,
  SENTRY_SHARED_OPTIONS,
  captureExceptionWithSearchParams,
  getSearchParamsContext,
  getSearchParamsContextFromUrl,
  scrubBreadcrumb,
  scrubRequestUrl,
  scrubSpan,
  withServerSearchParamsContext,
} from "./sentry-context";

const { scopeMock, captureExceptionMock, withScopeMock } = vi.hoisted(() => {
  const scopeMock = { setContext: vi.fn() };
  return {
    scopeMock,
    captureExceptionMock: vi.fn(() => "event-id"),
    withScopeMock: vi.fn((callback: (scope: typeof scopeMock) => unknown) =>
      callback(scopeMock),
    ),
  };
});

vi.mock("@sentry/nextjs", () => ({
  captureException: captureExceptionMock,
  withScope: withScopeMock,
}));

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

const createSpan = (
  overrides: Partial<Parameters<typeof scrubSpan>[0]> = {},
): Parameters<typeof scrubSpan>[0] => ({
  trace_id: "trace",
  span_id: "span",
  name: "GET /api/downloads",
  start_timestamp: 0,
  status: "ok",
  is_segment: false,
  attributes: {},
  ...overrides,
});

describe("scrubSpan", () => {
  test("strips query and fragment from absolute URL attributes", () => {
    const result = scrubSpan(
      createSpan({
        attributes: {
          "url.full": "https://api.npmjs.org/downloads?package=react&token=x",
          "http.url": "https://example.com/path#section",
        },
      }),
    );

    expect(result.attributes).toEqual({
      "url.full": "https://api.npmjs.org/downloads",
      "http.url": "https://example.com/path",
    });
  });

  test("strips query from relative URL attributes", () => {
    const result = scrubSpan(
      createSpan({
        attributes: {
          "http.target": "/api/downloads?packages=react",
          url: "/compare?projects=a,b",
        },
      }),
    );

    expect(result.attributes).toEqual({
      "http.target": "/api/downloads",
      url: "/compare",
    });
  });

  test("scrubs attribute objects while keeping their unit", () => {
    const result = scrubSpan(
      createSpan({
        attributes: {
          "url.full": { value: "https://example.com/a?b=c", unit: "second" },
        },
      }),
    );

    expect(result.attributes["url.full"]).toEqual({
      value: "https://example.com/a",
      unit: "second",
    });
  });

  test("removes query and fragment attributes", () => {
    const result = scrubSpan(
      createSpan({
        attributes: {
          "url.query": "?packages=react",
          "http.query": "packages=react",
          "url.fragment": "top",
          "http.fragment": "top",
          "http.request.method": "GET",
        },
      }),
    );

    expect(result.attributes).toEqual({ "http.request.method": "GET" });
  });

  test("strips query from span name", () => {
    const result = scrubSpan(
      createSpan({ name: "GET https://example.com/api?secret=1" }),
    );

    expect(result.name).toBe("GET https://example.com/api");
  });

  test("leaves non-URL attributes and non-string URL values untouched", () => {
    const attributes = {
      "http.response.status_code": 200,
      "url.full": 42,
      "sentry.op": "http.client",
    };

    const result = scrubSpan(createSpan({ attributes }));

    expect(result.attributes).toEqual(attributes);
  });

  test("does not mutate the original span", () => {
    const span = createSpan({
      name: "GET /a?b=c",
      attributes: { "url.full": "https://example.com/a?b=c" },
    });

    scrubSpan(span);

    expect(span.name).toBe("GET /a?b=c");
    expect(span.attributes["url.full"]).toBe("https://example.com/a?b=c");
  });
});

describe("withServerSearchParamsContext", () => {
  test("adds allowed search params context from request URL", () => {
    const result = withServerSearchParamsContext({
      type: undefined,
      request: { url: "https://example.com/compare?projects=react&secret=x" },
    });

    expect(result.contexts?.searchParams).toEqual({
      searchParams: { projects: "react" },
      pathname: "/compare",
    });
  });

  test("returns event unchanged when no URL is present", () => {
    const event = { type: undefined };

    expect(withServerSearchParamsContext(event)).toBe(event);
  });
});

describe("Sentry options", () => {
  test("disables PII-bearing data collection", () => {
    expect(SENTRY_DATA_COLLECTION).toMatchObject({
      userInfo: false,
      cookies: false,
      httpHeaders: false,
      httpBodies: [],
      urlQueryParams: false,
    });
  });

  test("shares span and breadcrumb scrubbers across runtimes", () => {
    expect(SENTRY_SERVER_OPTIONS.beforeSendSpan).toBe(scrubSpan);
    expect(SENTRY_SERVER_OPTIONS.dataCollection).toBe(SENTRY_DATA_COLLECTION);
    expect(SENTRY_SERVER_OPTIONS.beforeBreadcrumb).toBe(
      SENTRY_SHARED_OPTIONS.beforeBreadcrumb,
    );
  });

  test("server beforeSend scrubs request URL and query string", () => {
    const result = SENTRY_SERVER_OPTIONS.beforeSend({
      type: undefined,
      request: {
        url: "https://example.com/api/downloads?packages=react",
        query_string: "packages=react",
      },
    });

    expect(result.request).toEqual({
      url: "https://example.com/api/downloads",
      query_string: undefined,
    });
    expect(result.contexts?.searchParams).toEqual({
      searchParams: {},
      pathname: "/api/downloads",
    });
  });
});

describe("getSearchParamsContext", () => {
  test("returns an empty object without a window", () => {
    expect(getSearchParamsContext()).toEqual({});
  });

  test("picks only allowed params and the pathname from window.location", () => {
    vi.stubGlobal("window", {
      location: {
        search: "?projects=react,vue&period=1y&scale=log&mode=a&token=secret",
        pathname: "/compare",
      },
    });

    expect(getSearchParamsContext()).toEqual({
      searchParams: {
        projects: "react,vue",
        period: "1y",
        scale: "log",
        mode: "a",
      },
      pathname: "/compare",
    });
  });

  test("omits allowed params that are absent", () => {
    vi.stubGlobal("window", { location: { search: "", pathname: "/" } });

    expect(getSearchParamsContext()).toEqual({
      searchParams: {},
      pathname: "/",
    });
  });

  test("warns and returns an empty object when reading location throws", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.stubGlobal("window", {
      get location(): never {
        throw new Error("denied");
      },
    });

    expect(getSearchParamsContext()).toEqual({});
    expect(warn).toHaveBeenCalledWith(
      "Failed to extract search params for Sentry context:",
      expect.any(Error),
    );
  });
});

describe("getSearchParamsContextFromUrl", () => {
  test("extracts allowed params and pathname", () => {
    expect(
      getSearchParamsContextFromUrl("https://x.dev/a/b?period=7d&secret=1"),
    ).toEqual({ searchParams: { period: "7d" }, pathname: "/a/b" });
  });

  test("warns and returns an empty object for an invalid URL", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    expect(getSearchParamsContextFromUrl("not a url")).toEqual({});
    expect(warn).toHaveBeenCalled();
  });
});

describe("scrubBreadcrumb", () => {
  test("returns the breadcrumb unchanged when it has no data", () => {
    const breadcrumb = { message: "hi" };

    expect(scrubBreadcrumb(breadcrumb)).toBe(breadcrumb);
  });

  test("strips queries from url, to and from while keeping other data", () => {
    const result = scrubBreadcrumb({
      category: "navigation",
      data: {
        url: "https://example.com/a?x=1#h",
        to: "/compare?projects=react",
        from: "/?q=1",
        status: 200,
      },
    });

    expect(result.data).toEqual({
      url: "https://example.com/a",
      to: "/compare",
      from: "/",
      status: 200,
    });
  });

  test("ignores non-string url values", () => {
    const result = scrubBreadcrumb({ data: { url: 5, to: "/b?x=1" } });

    expect(result.data).toEqual({ url: 5, to: "/b" });
  });

  test("falls back to text stripping when the URL cannot be parsed", () => {
    const result = scrubBreadcrumb({ data: { url: "http://[bad?x=1" } });

    expect(result.data).toEqual({ url: "http://[bad" });
  });
});

describe("scrubRequestUrl", () => {
  test("returns the event when there is no request", () => {
    const event = { type: undefined };

    expect(scrubRequestUrl(event)).toBe(event);
  });

  test("clears the query string even when the URL is not a string", () => {
    const event = {
      type: undefined,
      request: { query_string: "a=1" },
    };

    expect(scrubRequestUrl(event).request).toEqual({
      query_string: undefined,
    });
  });

  test("leaves a request without a query string untouched except the URL", () => {
    const event = {
      type: undefined,
      request: { url: "https://x.dev/p?q=1#f" },
    };

    expect(scrubRequestUrl(event).request?.url).toBe("https://x.dev/p");
  });

  test("warns and keeps the URL when it cannot be parsed", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const event = { type: undefined, request: { url: "garbage" } };

    expect(scrubRequestUrl(event).request?.url).toBe("garbage");
    expect(warn).toHaveBeenCalledWith(
      "Failed to scrub request URL for Sentry event:",
      expect.any(Error),
    );
  });
});

describe("withServerSearchParamsContext URL sources", () => {
  test("falls back to the trace data URL", () => {
    const result = withServerSearchParamsContext({
      type: undefined,
      contexts: {
        trace: {
          span_id: "s",
          trace_id: "t",
          data: { url: "https://x.dev/t?mode=m" },
        },
      },
    });

    expect(result.contexts?.searchParams).toEqual({
      searchParams: { mode: "m" },
      pathname: "/t",
    });
    expect(result.contexts?.trace).toBeDefined();
  });

  test("falls back to the url tag", () => {
    const result = withServerSearchParamsContext({
      type: undefined,
      tags: { url: "https://x.dev/tag?scale=s" },
    });

    expect(result.contexts?.searchParams).toEqual({
      searchParams: { scale: "s" },
      pathname: "/tag",
    });
  });

  test("ignores a non-string URL", () => {
    const event = { type: undefined, tags: { url: 5 } };

    expect(withServerSearchParamsContext(event)).toBe(event);
  });
});

describe("captureExceptionWithSearchParams", () => {
  test("attaches the searchParams context and forwards the exception and options", () => {
    const error = new Error("boom");
    const options = { level: "warning" as const };

    const result = captureExceptionWithSearchParams(error, options);

    expect(scopeMock.setContext).toHaveBeenCalledWith("searchParams", {});
    expect(captureExceptionMock).toHaveBeenCalledWith(error, options);
    expect(result).toBe("event-id");
  });
});

describe("SENTRY_TRACES_SAMPLE_RATE", () => {
  test.each([
    ["production", 0.1],
    ["development", 1],
  ])("is based on NODE_ENV=%s", async (nodeEnv, expected) => {
    vi.stubEnv("NODE_ENV", nodeEnv);
    vi.resetModules();

    const sentryContext = await import("./sentry-context");

    expect(sentryContext.SENTRY_TRACES_SAMPLE_RATE).toBe(expected);
  });
});

describe("scrubSpan attribute edge cases", () => {
  test("keeps attribute objects with a non-string value", () => {
    const result = scrubSpan(
      createSpan({ attributes: { url: { value: 5 } } as never }),
    );

    expect(result.attributes.url).toEqual({ value: 5 });
  });
});
