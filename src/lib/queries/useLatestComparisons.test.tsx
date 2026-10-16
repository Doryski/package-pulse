import { createTestQueryClient } from "@/test/render";
import { QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { PropsWithChildren } from "react";
import { afterEach, describe, expect, test, vi } from "vitest";
import useLatestComparisons from "./useLatestComparisons";

const POLL_INTERVAL_MS = 60 * 1000;

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

  test("does not fetch while disabled", () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(Response.json({ comparisons: [], total: 0 }));
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(
      () => useLatestComparisons({ enabled: false }),
      {
        wrapper,
      },
    );

    expect(result.current.fetchStatus).toBe("idle");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test("polls while enabled and stops once disabled", async () => {
    vi.useFakeTimers();
    const fetchMock = vi
      .fn()
      .mockImplementation(async () =>
        Response.json({ comparisons: [], total: 0 }),
      );
    vi.stubGlobal("fetch", fetchMock);
    const advance = (ms: number) =>
      act(async () => {
        await vi.advanceTimersByTimeAsync(ms);
      });

    const { rerender } = renderHook(
      ({ enabled }) => useLatestComparisons({ enabled }),
      { wrapper, initialProps: { enabled: true } },
    );

    await advance(0);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await advance(POLL_INTERVAL_MS);
    expect(fetchMock).toHaveBeenCalledTimes(2);

    rerender({ enabled: false });
    await advance(POLL_INTERVAL_MS * 3);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
