import { createTestQueryClient } from "@/test/render";
import { QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { PropsWithChildren } from "react";
import { beforeEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({ searchNPMRegistry: vi.fn() }));

vi.mock("@/api/searchNpmRegistry", () => ({
  default: mocks.searchNPMRegistry,
}));

import useSearchNPMRegistry from "./useSearchNPMRegistry";

const wrapper = ({ children }: PropsWithChildren) => (
  <QueryClientProvider client={createTestQueryClient()}>
    {children}
  </QueryClientProvider>
);

describe("useSearchNPMRegistry", () => {
  beforeEach(() => {
    mocks.searchNPMRegistry.mockReset();
  });

  test("searches when the term has at least two characters", async () => {
    mocks.searchNPMRegistry.mockResolvedValue(["react"]);

    const { result } = renderHook(() => useSearchNPMRegistry("re"), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mocks.searchNPMRegistry).toHaveBeenCalledWith("re");
    expect(result.current.data).toEqual(["react"]);
  });

  test.each(["", "r"])("does not search for %j", (term) => {
    const { result } = renderHook(() => useSearchNPMRegistry(term), {
      wrapper,
    });

    expect(result.current.fetchStatus).toBe("idle");
    expect(mocks.searchNPMRegistry).not.toHaveBeenCalled();
  });
});
