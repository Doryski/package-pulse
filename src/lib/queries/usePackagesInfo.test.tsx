import { createTestQueryClient } from "@/test/render";
import { QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { PropsWithChildren } from "react";
import { beforeEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({ loadPackageInfo: vi.fn() }));

vi.mock("@/api/packageData", () => ({
  loadPackageInfo: mocks.loadPackageInfo,
}));

import usePackagesInfo, {
  packageInfoQueryOptions,
  useLatestReleases,
} from "./usePackagesInfo";

const wrapper = ({ children }: PropsWithChildren) => (
  <QueryClientProvider client={createTestQueryClient()}>
    {children}
  </QueryClientProvider>
);

const RELEASE = { version: "1.0.0", date: "2024-01-01" } as const;

describe("usePackagesInfo", () => {
  beforeEach(() => {
    mocks.loadPackageInfo.mockReset();
  });

  test("loads info per project with the query signal", async () => {
    mocks.loadPackageInfo.mockImplementation(async (name: string) => ({
      name,
    }));

    const { result } = renderHook(() => usePackagesInfo(["react", "vue"]), {
      wrapper,
    });

    await waitFor(() =>
      expect(result.current.every((query) => query.isSuccess)).toBe(true),
    );
    expect(result.current.map((query) => query.data)).toEqual([
      { name: "react" },
      { name: "vue" },
    ]);
    expect(mocks.loadPackageInfo).toHaveBeenCalledWith(
      "react",
      expect.any(AbortSignal),
    );
  });

  test("skips empty project names", () => {
    const { result } = renderHook(() => usePackagesInfo([""]), { wrapper });

    expect(result.current[0]?.fetchStatus).toBe("idle");
    expect(mocks.loadPackageInfo).not.toHaveBeenCalled();
  });

  test("query options are keyed by the package name", () => {
    expect(packageInfoQueryOptions("react").queryKey).toEqual([
      "package-info",
      "react",
    ]);
  });
});

describe("useLatestReleases", () => {
  beforeEach(() => {
    mocks.loadPackageInfo.mockReset();
  });

  test("maps each package to its latest release or null", async () => {
    mocks.loadPackageInfo.mockImplementation(async (name: string) => ({
      latestRelease: name === "react" ? RELEASE : null,
    }));

    const { result } = renderHook(() => useLatestReleases(["react", "vue"]), {
      wrapper,
    });

    await waitFor(() => expect(result.current).toEqual([RELEASE, null]));
  });
});
