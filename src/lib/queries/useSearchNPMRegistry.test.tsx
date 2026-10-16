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

const renderSearch = (initialSearch: string) =>
  renderHook(({ search }) => useSearchNPMRegistry(search), {
    wrapper,
    initialProps: { search: initialSearch },
  });

describe("useSearchNPMRegistry", () => {
  beforeEach(() => {
    mocks.searchNPMRegistry.mockReset();
  });

  test("searches the normalized term with the query signal", async () => {
    mocks.searchNPMRegistry.mockResolvedValue(["react"]);

    const { result } = renderSearch("  Re ");

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mocks.searchNPMRegistry).toHaveBeenCalledWith(
      "re",
      expect.any(AbortSignal),
    );
    expect(result.current.data).toEqual(["react"]);
  });

  test.each(["", "r", "  r  "])("does not search for %j", (term) => {
    const { result } = renderSearch(term);

    expect(result.current.fetchStatus).toBe("idle");
    expect(mocks.searchNPMRegistry).not.toHaveBeenCalled();
  });

  test("keeps the previous results while the next term loads", async () => {
    mocks.searchNPMRegistry.mockResolvedValueOnce(["react"]);
    const { result, rerender } = renderSearch("re");
    await waitFor(() => expect(result.current.data).toEqual(["react"]));

    mocks.searchNPMRegistry.mockReturnValueOnce(new Promise(() => {}));
    rerender({ search: "rea" });

    await waitFor(() => expect(result.current.isFetching).toBe(true));
    expect(result.current.isPlaceholderData).toBe(true);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toEqual(["react"]);
  });

  test("drops the previous results once the term is too short", async () => {
    mocks.searchNPMRegistry.mockResolvedValueOnce(["react"]);
    const { result, rerender } = renderSearch("re");
    await waitFor(() => expect(result.current.data).toEqual(["react"]));

    rerender({ search: "r" });

    expect(result.current.data).toBeUndefined();
  });

  test("exposes a registry failure as an error, not as no results", async () => {
    mocks.searchNPMRegistry.mockRejectedValue(new Error("down"));

    const { result } = renderSearch("react");

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.data).toBeUndefined();
  });
});
