import { createTestQueryClient } from "@/test/render";
import { QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { PropsWithChildren } from "react";
import { beforeEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  loadPackageInfo: vi.fn(),
  loadBundleSize: vi.fn(),
}));

vi.mock("@/api/packageData", () => ({
  loadPackageInfo: mocks.loadPackageInfo,
  loadBundleSize: mocks.loadBundleSize,
}));

import useBundleSize, { bundleSizeQueryOptions } from "./useBundleSize";

const wrapper = ({ children }: PropsWithChildren) => (
  <QueryClientProvider client={createTestQueryClient()}>
    {children}
  </QueryClientProvider>
);

describe("useBundleSize", () => {
  beforeEach(() => {
    mocks.loadPackageInfo.mockReset();
    mocks.loadBundleSize.mockReset();
  });

  test("loads the bundle size of the latest version per project", async () => {
    mocks.loadPackageInfo.mockImplementation(async (name: string) => ({
      latestVersion: `${name.length}.0.0`,
    }));
    mocks.loadBundleSize.mockImplementation(
      async (name: string, version: string) => ({ name, version }),
    );

    const { result } = renderHook(() => useBundleSize(["react", "vue"]), {
      wrapper,
    });

    await waitFor(() =>
      expect(result.current.every((query) => query.isSuccess)).toBe(true),
    );
    expect(result.current.map((query) => query.data)).toEqual([
      { name: "react", version: "5.0.0" },
      { name: "vue", version: "3.0.0" },
    ]);
    expect(mocks.loadBundleSize).toHaveBeenCalledWith(
      "react",
      "5.0.0",
      expect.any(AbortSignal),
    );
  });

  test("stays idle until the latest version is known", async () => {
    mocks.loadPackageInfo.mockResolvedValue({ latestVersion: null });

    const { result } = renderHook(() => useBundleSize(["react"]), {
      wrapper,
    });

    await waitFor(() => expect(mocks.loadPackageInfo).toHaveBeenCalled());
    expect(result.current[0]?.fetchStatus).toBe("idle");
    expect(mocks.loadBundleSize).not.toHaveBeenCalled();
  });

  test("does not load for an empty project name", () => {
    const { result } = renderHook(() => useBundleSize([""]), { wrapper });

    expect(result.current[0]?.fetchStatus).toBe("idle");
    expect(mocks.loadPackageInfo).not.toHaveBeenCalled();
    expect(mocks.loadBundleSize).not.toHaveBeenCalled();
  });

  test("returns no queries for no projects", () => {
    const { result } = renderHook(() => useBundleSize([]), { wrapper });

    expect(result.current).toEqual([]);
  });

  test("query options are keyed by name and version and never go stale", () => {
    const options = bundleSizeQueryOptions("react", "1.0.0");

    expect(options.queryKey).toEqual(["bundle-size", "react", "1.0.0"]);
    expect(options.staleTime).toBe(Infinity);
    expect(bundleSizeQueryOptions("react", undefined).queryKey).toEqual([
      "bundle-size",
      "react",
      null,
    ]);
  });
});
