import { afterEach, describe, expect, test, vi } from "vitest";

const loadFn = async () => {
  vi.resetModules();
  return (await import("./upstreamFetchInit")).getUpstreamFetchInit;
};

describe("getUpstreamFetchInit", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  test("uses revalidate by default", async () => {
    vi.stubEnv("PP_E2E_TEST_PROXY", "");
    const getUpstreamFetchInit = await loadFn();
    expect(getUpstreamFetchInit(60)).toEqual({ next: { revalidate: 60 } });
  });

  test("disables caching when the e2e proxy is on", async () => {
    vi.stubEnv("PP_E2E_TEST_PROXY", "1");
    const getUpstreamFetchInit = await loadFn();
    expect(getUpstreamFetchInit(60)).toEqual({ cache: "no-store" });
  });
});
