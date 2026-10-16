import { createTestQueryClient } from "@/test/render";
import { QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { PropsWithChildren } from "react";
import { beforeEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({ loadDepsDev: vi.fn() }));

vi.mock("@/api/packageData", () => ({ loadDepsDev: mocks.loadDepsDev }));

import useDepsDev, { depsDevQueryOptions } from "./useDepsDev";

const wrapper = ({ children }: PropsWithChildren) => (
  <QueryClientProvider client={createTestQueryClient()}>
    {children}
  </QueryClientProvider>
);

describe("useDepsDev", () => {
  beforeEach(() => {
    mocks.loadDepsDev.mockReset();
  });

  test("loads deps.dev data by package name without waiting for package info", async () => {
    mocks.loadDepsDev.mockResolvedValue({ vulnerabilityCount: 0 });

    const { result } = renderHook(() => useDepsDev(["react"]), { wrapper });

    await waitFor(() => expect(result.current[0]?.isSuccess).toBe(true));
    expect(mocks.loadDepsDev).toHaveBeenCalledWith(
      "react",
      expect.any(AbortSignal),
    );
    expect(result.current[0]?.data).toEqual({ vulnerabilityCount: 0 });
  });

  test("stays idle for an empty project name", () => {
    const { result } = renderHook(() => useDepsDev([""]), { wrapper });

    expect(result.current[0]?.fetchStatus).toBe("idle");
    expect(mocks.loadDepsDev).not.toHaveBeenCalled();
  });

  test("query key holds only the package name", () => {
    expect(depsDevQueryOptions("react").queryKey).toEqual([
      "deps-dev",
      "react",
    ]);
  });
});
