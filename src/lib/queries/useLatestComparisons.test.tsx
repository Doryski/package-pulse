import { createTestQueryClient } from "@/test/render";
import { QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { PropsWithChildren } from "react";
import { afterEach, describe, expect, test, vi } from "vitest";
import useLatestComparisons from "./useLatestComparisons";

const wrapper = ({ children }: PropsWithChildren) => (
  <QueryClientProvider client={createTestQueryClient()}>
    {children}
  </QueryClientProvider>
);

describe("useLatestComparisons", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  test("returns parsed data", async () => {
    const payload = {
      comparisons: [{ id: "a", timestamp: 1, projects: ["react"] }],
      total: 1,
    };
    const fetchMock = vi.fn().mockResolvedValue(Response.json(payload));
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useLatestComparisons(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetchMock).toHaveBeenCalledWith("/api/comparisons?limit=6");
    expect(result.current.data).toEqual(payload);
  });

  test("returns raw data when the schema does not match", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(Response.json({ bad: 1 })),
    );

    const { result } = renderHook(() => useLatestComparisons(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({ bad: 1 });
  });

  test("errors when the response is not ok", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(null, { status: 500 })),
    );

    const { result } = renderHook(() => useLatestComparisons(), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("Failed to fetch comparisons");
  });
});
