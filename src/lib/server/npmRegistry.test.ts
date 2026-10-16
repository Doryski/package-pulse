/**
 * @vitest-environment node
 */
import { isAppError } from "@/lib/utils/AppError";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import {
  encodeRegistryPackageName,
  fetchLatestManifest,
  fetchPackageExists,
  fetchPackument,
  REGISTRY_TIMEOUT_MS,
} from "./npmRegistry";

const fetchMock = vi.fn<typeof fetch>();

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

const lastCall = () => {
  const [url, init] = fetchMock.mock.calls.at(-1) ?? [];
  return { url, init };
};

const manifest = {
  name: "@scope/pkg",
  version: "1.2.3",
  description: "A package",
  keywords: ["a"],
  repository: { type: "git", url: "git+https://github.com/o/r.git" },
  license: "MIT",
  homepage: "https://example.com",
  dependencies: { dep: "^1.0.0" },
};

const timeoutError = () =>
  Object.assign(new Error("timed out"), { name: "TimeoutError" });

const captureError = async (promise: Promise<unknown>) =>
  promise.then(
    () => undefined,
    (error: unknown) => error,
  );

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  fetchMock.mockReset();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("encodeRegistryPackageName", () => {
  test("keeps the scope marker and encodes the slash", () => {
    expect(encodeRegistryPackageName("@scope/pkg")).toBe("@scope%2Fpkg");
  });

  test("leaves unscoped names untouched", () => {
    expect(encodeRegistryPackageName("react")).toBe("react");
  });
});

describe("fetchPackageExists", () => {
  test("sends a HEAD request for the encoded name", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 200 }));

    await expect(fetchPackageExists("@scope/pkg")).resolves.toBe(true);

    const { url, init } = lastCall();
    expect(url).toBe("https://registry.npmjs.org/@scope%2Fpkg");
    expect(init?.method).toBe("HEAD");
    expect(init?.signal).toBeInstanceOf(AbortSignal);
  });

  test("throws on a transient registry failure instead of reporting a miss", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 429 }));
    await expect(fetchPackageExists("react")).rejects.toMatchObject({
      status: 502,
    });
  });

  test("returns false for a missing package", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 404 }));
    await expect(fetchPackageExists("missing")).resolves.toBe(false);
  });

  test("uses the upstream fetch cache init", async () => {
    vi.stubEnv("PP_E2E_TEST_PROXY", "");
    fetchMock.mockResolvedValue(new Response(null, { status: 200 }));
    await fetchPackageExists("react");
    expect(lastCall().init).toMatchObject({ next: { revalidate: 3600 } });
  });
});

describe("fetchLatestManifest", () => {
  test("fetches /<name>/latest and returns the manifest", async () => {
    fetchMock.mockResolvedValue(jsonResponse(manifest));

    await expect(fetchLatestManifest("@scope/pkg")).resolves.toEqual(manifest);
    expect(lastCall().url).toBe(
      "https://registry.npmjs.org/@scope%2Fpkg/latest",
    );
  });

  test("returns null on 404", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ error: "Not found" }, 404));
    await expect(fetchLatestManifest("missing")).resolves.toBeNull();
  });

  test("throws a 502 AppError on other upstream failures", async () => {
    fetchMock.mockResolvedValue(jsonResponse({}, 500));

    const error = await captureError(fetchLatestManifest("react"));

    expect(isAppError(error)).toBe(true);
    expect(error).toMatchObject({ status: 502 });
  });

  test("throws a 504 AppError on timeout", async () => {
    fetchMock.mockRejectedValue(timeoutError());

    const error = await captureError(fetchLatestManifest("react"));

    expect(isAppError(error)).toBe(true);
    expect(error).toMatchObject({ status: 504 });
  });

  test("rethrows non-timeout errors unchanged", async () => {
    const abort = Object.assign(new Error("aborted"), { name: "AbortError" });
    fetchMock.mockRejectedValue(abort);
    await expect(fetchLatestManifest("react")).rejects.toBe(abort);
  });

  test("aborts when the caller signal aborts", async () => {
    fetchMock.mockResolvedValue(jsonResponse(manifest));
    const controller = new AbortController();

    await fetchLatestManifest("react", controller.signal);
    const signal = lastCall().init?.signal;
    controller.abort();

    expect(signal?.aborted).toBe(true);
  });
});

describe("fetchPackument", () => {
  const packument = {
    name: "react",
    "dist-tags": { latest: "1.0.0" },
    versions: { "1.0.0": {} },
    time: { "1.0.0": "2024-01-01T00:00:00.000Z" },
  };

  test("always bypasses the fetch cache", async () => {
    vi.stubEnv("PP_E2E_TEST_PROXY", "");
    fetchMock.mockResolvedValue(jsonResponse(packument));

    await expect(fetchPackument("react")).resolves.toEqual(packument);

    const { url, init } = lastCall();
    expect(url).toBe("https://registry.npmjs.org/react");
    expect(init?.cache).toBe("no-store");
    expect(init).not.toHaveProperty("next");
  });

  test("returns null on 404", async () => {
    fetchMock.mockResolvedValue(jsonResponse({}, 404));
    await expect(fetchPackument("missing")).resolves.toBeNull();
  });

  test("times out after the registry timeout", async () => {
    const timeoutSpy = vi.spyOn(AbortSignal, "timeout");
    const timedOut = AbortSignal.abort(timeoutError());
    timeoutSpy.mockReturnValue(timedOut);
    fetchMock.mockImplementation(async (_url, init) => {
      init?.signal?.throwIfAborted();
      return jsonResponse(packument);
    });

    const error = await captureError(
      fetchPackument("react", new AbortController().signal),
    );

    expect(timeoutSpy).toHaveBeenCalledWith(REGISTRY_TIMEOUT_MS);
    expect(error).toMatchObject({ status: 504 });
    timeoutSpy.mockRestore();
  });
});
