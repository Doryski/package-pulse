/**
 * @vitest-environment node
 */
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import {
  BUNDLE_SIZE_CONCURRENCY,
  getBundleSizes,
  isValidPackageSpec,
  parsePackageSpec,
} from "./bundleSize";

const { fakeCache } = vi.hoisted(() => ({
  fakeCache: { current: null as null | { clear: () => void } },
}));

vi.mock("@/lib/config/serverCache", async () => {
  const { createFakeServerCache } = await import("@/test/fakeServerCache");
  const cache = createFakeServerCache();
  fakeCache.current = cache;
  return { cacheDerived: cache.cacheDerived };
});

const fetchMock = vi.fn<typeof fetch>();

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

const bundle = {
  size: 1000,
  gzip: 400,
  dependencyCount: 2,
  hasJSModule: true,
  hasSideEffects: false,
};

const REGISTRY = "https://registry.npmjs.org/";
const BUNDLEPHOBIA = "https://bundlephobia.com/api/size?package=";

const bundleSpec = (url: string) =>
  decodeURIComponent(url.slice(BUNDLEPHOBIA.length));

const respond = async (input: string | URL | Request) => {
  const url = String(input);
  if (url.startsWith(REGISTRY)) {
    const name = decodeURIComponent(
      url.slice(REGISTRY.length, -"/latest".length),
    );
    if (name.startsWith("missing-")) return json({}, 404);
    return json({ name, version: "3.0.0" });
  }
  const spec = bundleSpec(url);
  if (spec.startsWith("gone@")) return json({}, 404);
  if (spec.startsWith("broken@")) return json({ error: {} }, 500);
  if (spec.startsWith("cjs@")) return json({ ...bundle, hasJSModule: false });
  if (spec.startsWith("sparse@")) return json({ hasSideEffects: ["x.css"] });
  return json(bundle);
};

const bundleCalls = () =>
  fetchMock.mock.calls
    .map(([url]) => String(url))
    .filter((url) => url.startsWith(BUNDLEPHOBIA))
    .map(bundleSpec);

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockImplementation(respond);
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

afterEach(() => {
  fetchMock.mockReset();
  fakeCache.current?.clear();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("parsePackageSpec", () => {
  test.each([
    ["react", { name: "react", version: undefined }],
    ["react@18.2.0", { name: "react", version: "18.2.0" }],
    ["@scope/pkg", { name: "@scope/pkg", version: undefined }],
    [
      "@scope/pkg@1.0.0-beta.1",
      { name: "@scope/pkg", version: "1.0.0-beta.1" },
    ],
  ])("parses %s", (spec, expected) => {
    expect(parsePackageSpec(spec)).toEqual(expected);
  });
});

describe("isValidPackageSpec", () => {
  test.each([
    ["react", true],
    ["@scope/pkg@1.0.0", true],
    ["react@1.0.0+build.5", true],
    ["react@", false],
    ["react@1 0", false],
    ["Bad Name@1.0.0", false],
  ])("%s → %s", (spec, expected) => {
    expect(isValidPackageSpec(spec)).toBe(expected);
  });
});

describe("getBundleSizes", () => {
  test("derives the bundle size for pinned and latest versions", async () => {
    const result = await getBundleSizes(["@scope/pkg", "react@18.2.0"]);

    expect(result).toEqual({
      data: {
        "@scope/pkg": {
          version: "3.0.0",
          size: 1000,
          gzip: 400,
          dependencyCount: 2,
          treeShakeable: true,
        },
        react: {
          version: "18.2.0",
          size: 1000,
          gzip: 400,
          dependencyCount: 2,
          treeShakeable: true,
        },
      },
      errors: {},
    });
    expect(bundleCalls().toSorted()).toEqual([
      "@scope/pkg@3.0.0",
      "react@18.2.0",
    ]);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://registry.npmjs.org/@scope%2Fpkg/latest",
      expect.anything(),
    );
  });

  test("encodes the spec in the bundlephobia url", async () => {
    await getBundleSizes(["@scope/pkg@1.0.0"]);
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      "https://bundlephobia.com/api/size?package=%40scope%2Fpkg%401.0.0",
    );
  });

  test("is not tree-shakeable without an ES module or with side effects", async () => {
    const result = await getBundleSizes(["cjs@1.0.0", "sparse@1.0.0"]);

    expect(result.data.cjs?.treeShakeable).toBe(false);
    expect(result.data.sparse).toEqual({
      version: "1.0.0",
      size: null,
      gzip: null,
      dependencyCount: null,
      treeShakeable: false,
    });
  });

  test("maps missing packages to notFound and failures to upstream", async () => {
    const result = await getBundleSizes([
      "broken@1.0.0",
      "gone@1.0.0",
      "missing-pkg",
    ]);

    expect(result).toEqual({
      data: { broken: null, gone: null, "missing-pkg": null },
      errors: {
        broken: "upstream",
        gone: "notFound",
        "missing-pkg": "notFound",
      },
    });
  });

  test("caches results per name@version", async () => {
    await getBundleSizes(["react@1.0.0"]);
    await getBundleSizes(["react@1.0.0", "react-dom@1.0.0"]);

    expect(bundleCalls()).toEqual(["react@1.0.0", "react-dom@1.0.0"]);
  });

  test("does not cache upstream failures", async () => {
    await getBundleSizes(["broken@1.0.0"]);
    await getBundleSizes(["broken@1.0.0"]);

    expect(bundleCalls()).toEqual(["broken@1.0.0", "broken@1.0.0"]);
  });

  test(`runs at most ${BUNDLE_SIZE_CONCURRENCY} lookups at once`, async () => {
    let active = 0;
    let peak = 0;
    fetchMock.mockImplementation(async (input) => {
      active += 1;
      peak = Math.max(peak, active);
      await new Promise((resolve) => setTimeout(resolve, 5));
      active -= 1;
      return respond(input);
    });

    await getBundleSizes(["a@1.0.0", "b@1.0.0", "c@1.0.0", "d@1.0.0"]);

    expect(peak).toBe(BUNDLE_SIZE_CONCURRENCY);
  });
});
