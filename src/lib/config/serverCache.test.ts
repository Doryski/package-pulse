import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

const { unstableCacheMock } = vi.hoisted(() => ({
  unstableCacheMock: vi.fn(),
}));

vi.mock("next/cache", () => ({ unstable_cache: unstableCacheMock }));

const loadCacheDerived = async () => {
  vi.resetModules();
  return (await import("./serverCache")).cacheDerived;
};

const fetchValue = async (name: string) => ({ name });

beforeEach(() => {
  unstableCacheMock.mockImplementation((fn: unknown) => fn);
});

afterEach(() => {
  unstableCacheMock.mockReset();
  vi.unstubAllEnvs();
});

describe("cacheDerived", () => {
  test("wraps the function with unstable_cache", async () => {
    vi.stubEnv("PP_E2E_TEST_PROXY", "");
    const cached = vi.fn(fetchValue);
    unstableCacheMock.mockReturnValue(cached);
    const cacheDerived = await loadCacheDerived();

    const result = cacheDerived(fetchValue, ["package-info"], {
      revalidate: 3600,
      tags: ["package-info:react"],
    });

    expect(result).toBe(cached);
    expect(unstableCacheMock).toHaveBeenCalledWith(
      fetchValue,
      ["package-info"],
      { revalidate: 3600, tags: ["package-info:react"] },
    );
    await expect(result("react")).resolves.toEqual({ name: "react" });
  });

  test("returns the function unwrapped when the e2e proxy is on", async () => {
    vi.stubEnv("PP_E2E_TEST_PROXY", "1");
    const cacheDerived = await loadCacheDerived();

    const result = cacheDerived(fetchValue, ["package-info"], {
      revalidate: 3600,
    });

    expect(result).toBe(fetchValue);
    expect(unstableCacheMock).not.toHaveBeenCalled();
  });
});
