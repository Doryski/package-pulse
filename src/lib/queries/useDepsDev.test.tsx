import { createTestQueryClient } from "@/test/render";
import { QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { PropsWithChildren } from "react";
import { beforeEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  fetchPackageInfo: vi.fn(),
  fetchDepsDev: vi.fn(),
}));

vi.mock("@/api/fetchPackageInfo", () => ({
  fetchPackageInfo: mocks.fetchPackageInfo,
  fetchDepsDev: mocks.fetchDepsDev,
}));

import useDepsDev from "./useDepsDev";

const wrapper = ({ children }: PropsWithChildren) => (
  <QueryClientProvider client={createTestQueryClient()}>
    {children}
  </QueryClientProvider>
);

describe("useDepsDev", () => {
  beforeEach(() => {
    mocks.fetchPackageInfo.mockReset();
    mocks.fetchDepsDev.mockReset();
  });

  test("fetches deps.dev data using the latest version", async () => {
    mocks.fetchPackageInfo.mockResolvedValue({
      latestVersion: { version: "1.2.3" },
    });
    mocks.fetchDepsDev.mockResolvedValue({ advisories: 0 });

    const { result } = renderHook(() => useDepsDev(["react"]), { wrapper });

    await waitFor(() => expect(result.current[0]?.isSuccess).toBe(true));
    expect(mocks.fetchDepsDev).toHaveBeenCalledWith("react", "1.2.3");
    expect(result.current[0]?.data).toEqual({ advisories: 0 });
  });

  test("query function resolves null when the version is unknown", async () => {
    mocks.fetchPackageInfo.mockResolvedValue({ latestVersion: null });
    const queryClient = createTestQueryClient();
    const customWrapper = ({ children }: PropsWithChildren) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    renderHook(() => useDepsDev(["react"]), { wrapper: customWrapper });

    await waitFor(() => expect(mocks.fetchPackageInfo).toHaveBeenCalled());
    const depsQuery = queryClient
      .getQueryCache()
      .findAll({ queryKey: ["depsDev"] })[0];
    await expect(depsQuery?.fetch()).resolves.toBeNull();
  });

  test("stays idle while no version is known", async () => {
    mocks.fetchPackageInfo.mockResolvedValue({ latestVersion: null });

    const { result } = renderHook(() => useDepsDev(["react"]), { wrapper });

    await waitFor(() => expect(mocks.fetchPackageInfo).toHaveBeenCalled());
    expect(result.current[0]?.fetchStatus).toBe("idle");
    expect(mocks.fetchDepsDev).not.toHaveBeenCalled();
  });
});
