/**
 * @vitest-environment node
 */
import { describe, expect, test } from "vitest";
import {
  SENTRY_DATA_COLLECTION,
  SENTRY_SERVER_OPTIONS,
  SENTRY_SHARED_OPTIONS,
  scrubSpan,
  withServerSearchParamsContext,
} from "./sentry-context";

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
