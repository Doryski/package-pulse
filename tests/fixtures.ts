import {
  type APIRequestContext,
  type BrowserContext,
  expect,
  type Request,
  type Route,
} from "@playwright/test";
import { test as base } from "next/experimental/testmode/playwright.js";
import { hashString } from "./mocks/data";
import { defaultMockHandler } from "./mocks/handlers";

const SENTRY_TUNNEL_PATH = "/monitoring";
const EMPTY_HTML =
  "<!doctype html><html><head><title>e2e</title></head></html>";

type E2EFixtures = {
  unhandledGuard: string[];
  mocks: void;
  clientIp: string;
  externalNonFetchGuard: void;
  api: APIRequestContext;
};

export const ipFromSeed = (seed: string) => {
  const hash = hashString(seed);
  const octets = [hash >>> 16, hash >>> 8, hash].map((part) => part & 255);
  return ["10", ...octets].join(".");
};

export const originHeader = (baseURL: string) => ({
  Origin: new URL(baseURL).origin,
});

const isSameOrigin = (request: Request, origin: string) =>
  new URL(request.url()).origin === origin;

const isBrowserFetch = (request: Request) =>
  !request.isNavigationRequest() && request.resourceType() === "fetch";

const isSentryTunnel = (request: Request) =>
  new URL(request.url()).pathname === SENTRY_TUNNEL_PATH;

const fulfillExternal = (route: Route) => {
  const request = route.request();
  if (request.isNavigationRequest() || request.resourceType() === "document") {
    return route.fulfill({
      status: 200,
      contentType: "text/html",
      body: EMPTY_HTML,
    });
  }
  return route.fulfill({ status: 204 });
};

const routeAll = (
  context: BrowserContext,
  handler: (route: Route) => Promise<void>,
) => context.route("**", handler);

const requireBaseURL = (baseURL: string | undefined) => {
  if (!baseURL) throw new Error("e2e fixtures require use.baseURL");
  return baseURL;
};

const DEV_OVERLAY_STACK_FRAMES_PATH = "/__nextjs_original-stack-frames";

const absorbDevOverlayStackFrames = (request: globalThis.Request) => {
  if (!new URL(request.url).pathname.startsWith(DEV_OVERLAY_STACK_FRAMES_PATH))
    return undefined;
  return Response.json([]);
};

export const test = base.extend<E2EFixtures>({
  nextOptions: { fetchLoopback: false },
  unhandledGuard: [
    async ({ next }, provide) => {
      const unhandled: string[] = [];
      next.onFetch((request) => {
        unhandled.push(`${request.method} ${request.url}`);
        return "abort";
      });
      await provide(unhandled);
      expect(unhandled, "unmocked upstream requests").toEqual([]);
    },
    { auto: true },
  ],
  mocks: [
    async ({ next, unhandledGuard: _unhandledGuard }, provide) => {
      next.onFetch(defaultMockHandler);
      next.onFetch(absorbDevOverlayStackFrames);
      await provide();
    },
    { auto: true },
  ],
  clientIp: [
    async ({ next: _next, page, baseURL }, provide, testInfo) => {
      const ip = ipFromSeed(
        `${testInfo.testId}:${testInfo.retry}:${testInfo.repeatEachIndex}`,
      );
      const origin = new URL(requireBaseURL(baseURL)).origin;
      await routeAll(page.context(), (route) => {
        const request = route.request();
        if (!isSameOrigin(request, origin)) return route.fallback();
        return route.fallback({
          headers: { ...request.headers(), "x-real-ip": ip },
        });
      });
      await provide(ip);
    },
    { auto: true },
  ],
  externalNonFetchGuard: [
    async ({ next: _next, clientIp: _clientIp, page, baseURL }, provide) => {
      const origin = new URL(requireBaseURL(baseURL)).origin;
      await routeAll(page.context(), (route) => {
        const request = route.request();
        if (isSameOrigin(request, origin)) {
          if (isSentryTunnel(request)) return route.fulfill({ status: 200 });
          return route.fallback();
        }
        if (isBrowserFetch(request)) return route.fallback();
        return fulfillExternal(route);
      });
      await provide();
    },
    { auto: true },
  ],
  api: async (
    { playwright, baseURL, clientIp, _nextWorker, mocks: _mocks },
    provide,
    testInfo,
  ) => {
    const context = await playwright.request.newContext({
      baseURL: requireBaseURL(baseURL),
      extraHTTPHeaders: {
        "Next-Test-Proxy-Port": String(_nextWorker.proxyPort),
        "Next-Test-Data": testInfo.testId,
        "x-real-ip": clientIp,
      },
    });
    await provide(context);
    await context.dispose();
  },
});

export { expect };
