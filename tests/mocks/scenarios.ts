import { NPM_API_FIRST_DAY } from "@/lib/config/constants";
import type { NextFixture } from "next/experimental/testmode/playwright.js";
import {
  emptyResponse,
  jsonResponse,
  MOCK_HOSTS,
  type MockHandler,
  type MockHost,
  type MockTarget,
  parseMockTarget,
  rangeResponse,
  similarResponse,
  targetPackages,
} from "./handlers";
import { buildBulkRange, buildRangePeriod, isMissingPackage } from "./data";

export type MockRegistrar = Pick<NextFixture, "onFetch">;

const KNOWN_HOSTS: readonly string[] = Object.values(MOCK_HOSTS);

const isMockHost = (value: string): value is MockHost =>
  KNOWN_HOSTS.includes(value);

const touchesPackage = (target: MockTarget, pkg: string) =>
  targetPackages(target).includes(pkg);

const forTarget =
  (respond: (target: MockTarget) => Response | undefined): MockHandler =>
  (request) => {
    const target = parseMockTarget(request);
    if (!target) return undefined;
    return respond(target);
  };

const forPackage = (
  pkg: string,
  respond: (target: MockTarget) => Response | undefined,
) =>
  forTarget((target) => {
    if (!touchesPackage(target, pkg)) return undefined;
    return respond(target);
  });

const notFoundRegistry = new WeakMap<MockRegistrar, Set<string>>();

const isMissingIn = (missing: ReadonlySet<string>) => (name: string) =>
  missing.has(name) || isMissingPackage(name);

const notFoundFor = (missing: ReadonlySet<string>) => (target: MockTarget) => {
  if (!targetPackages(target).some((name) => missing.has(name))) {
    return undefined;
  }
  if (target.kind === "range") {
    return rangeResponse(target, isMissingIn(missing));
  }
  if (target.kind === "package" && target.method === "HEAD") {
    return emptyResponse(404);
  }
  return jsonResponse({ error: "Not found" }, 404);
};

export const notFound = (next: MockRegistrar, pkg: string) => {
  const registered = notFoundRegistry.get(next);
  if (registered) {
    registered.add(pkg);
    return;
  }
  const missing = new Set([pkg]);
  notFoundRegistry.set(next, missing);
  next.onFetch(forTarget(notFoundFor(missing)));
};

const serverErrorResponse = () =>
  jsonResponse({ error: "Internal Server Error" }, 500);

export const serverError = (next: MockRegistrar, pkgOrHost: string) => {
  if (!isMockHost(pkgOrHost)) {
    next.onFetch(forPackage(pkgOrHost, serverErrorResponse));
    return;
  }
  next.onFetch((request) => {
    if (new URL(request.url).hostname !== pkgOrHost) return undefined;
    return serverErrorResponse();
  });
};

export const upstreamRateLimited = (next: MockRegistrar, pkg: string) =>
  next.onFetch(
    forPackage(pkg, (target) => {
      if (target.kind !== "range") return undefined;
      return jsonResponse({ error: "Too Many Requests" }, 429);
    }),
  );

export const partial = (next: MockRegistrar, pkg: string) =>
  next.onFetch(
    forPackage(pkg, (target) => {
      if (target.kind !== "range" || target.start !== NPM_API_FIRST_DAY) {
        return undefined;
      }
      return serverErrorResponse();
    }),
  );

const forOpenAi = (respond: () => Response) =>
  forTarget((target) => {
    if (target.kind !== "openai") return undefined;
    return respond();
  });

export const similar = (next: MockRegistrar, projects: readonly string[]) =>
  next.onFetch(forOpenAi(() => similarResponse(projects)));

export const similarEmpty = (next: MockRegistrar) => similar(next, []);

export const similarError = (next: MockRegistrar) =>
  next.onFetch(
    forOpenAi(() =>
      jsonResponse(
        { error: { message: "e2e failure", type: "server_error" } },
        500,
      ),
    ),
  );

type RangePeriod = ReturnType<typeof buildRangePeriod>;

const DAY_MS = 86_400_000;

const lagCutoff = (lagDays: number) =>
  new Date(Date.now() - lagDays * DAY_MS).toISOString().slice(0, 10);

const zeroAfter = (period: RangePeriod, cutoff: string): RangePeriod => ({
  ...period,
  downloads: period.downloads.map((entry) =>
    entry.day > cutoff ? { ...entry, downloads: 0 } : entry,
  ),
});

export const trailingZeroDays = (next: MockRegistrar, lagDays: number) => {
  const cutoff = lagCutoff(lagDays);
  next.onFetch(
    forTarget((target) => {
      if (target.kind !== "range") return undefined;
      const { start, end, packages } = target;
      if (packages.length === 1) {
        const [pkg = ""] = packages;
        return jsonResponse(
          zeroAfter(buildRangePeriod(pkg, start, end), cutoff),
        );
      }
      const bulk = buildBulkRange(packages, start, end);
      return jsonResponse(
        Object.fromEntries(
          Object.entries(bulk).map(([name, period]) => [
            name,
            period ? zeroAfter(period, cutoff) : period,
          ]),
        ),
      );
    }),
  );
  return cutoff;
};
