import { createTestQueryClient } from "@/test/render";
import { QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { PropsWithChildren } from "react";
import { beforeEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({ fetchPackageInfo: vi.fn() }));

vi.mock("@/api/fetchPackageInfo", () => ({
  fetchPackageInfo: mocks.fetchPackageInfo,
}));

import usePackagesInfo from "./usePackagesInfo";

const wrapper = ({ children }: PropsWithChildren) => (
  <QueryClientProvider client={createTestQueryClient()}>
    {children}
  </QueryClientProvider>
);

describe("usePackagesInfo", () => {
  beforeEach(() => {
    mocks.fetchPackageInfo.mockReset();
  });

  test("fetches info per project", async () => {
    mocks.fetchPackageInfo.mockImplementation(async (name: string) => ({
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
  });

  test("skips empty project names", () => {
    const { result } = renderHook(() => usePackagesInfo([""]), { wrapper });

    expect(result.current[0]?.fetchStatus).toBe("idle");
    expect(mocks.fetchPackageInfo).not.toHaveBeenCalled();
  });
});
