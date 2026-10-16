import { createTestQueryClient } from "@/test/render";
import { QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { PropsWithChildren } from "react";
import { beforeEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({ fetchBundleSize: vi.fn() }));

vi.mock("@/api/fetchPackageInfo", () => ({
  fetchBundleSize: mocks.fetchBundleSize,
}));

import useBundleSize from "./useBundleSize";

const wrapper = ({ children }: PropsWithChildren) => (
  <QueryClientProvider client={createTestQueryClient()}>
    {children}
  </QueryClientProvider>
);

describe("useBundleSize", () => {
  beforeEach(() => {
    mocks.fetchBundleSize.mockReset();
  });

  test("fetches a bundle size per project", async () => {
    mocks.fetchBundleSize.mockImplementation(async (name: string) => ({
      name,
    }));

    const { result } = renderHook(() => useBundleSize(["react", "vue"]), {
      wrapper,
    });

    await waitFor(() =>
      expect(result.current.every((query) => query.isSuccess)).toBe(true),
    );
    expect(result.current.map((query) => query.data)).toEqual([
      { name: "react" },
      { name: "vue" },
    ]);
  });

  test("does not fetch for an empty project name", () => {
    const { result } = renderHook(() => useBundleSize([""]), { wrapper });

    expect(result.current[0]?.fetchStatus).toBe("idle");
    expect(mocks.fetchBundleSize).not.toHaveBeenCalled();
  });

  test("returns no queries for no projects", () => {
    const { result } = renderHook(() => useBundleSize([]), { wrapper });

    expect(result.current).toEqual([]);
  });
});
