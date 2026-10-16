import { createTestQueryClient } from "@/test/render";
import { QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { PropsWithChildren } from "react";
import { beforeEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({ fetchSimilarProjects: vi.fn() }));

vi.mock("../utils/fetchSimilarProjects", () => ({
  fetchSimilarProjects: mocks.fetchSimilarProjects,
}));

import useSimilarProjects from "./useSimilarProjects";

const createWrapper = () => {
  const queryClient = createTestQueryClient();
  const wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { queryClient, wrapper };
};

const getObserverOptions = (
  queryClient: ReturnType<typeof createTestQueryClient>,
) => {
  const options = queryClient.getQueryCache().getAll()[0]
    ?.observers[0]?.options;
  if (!options) throw new Error("expected an observer");
  return options;
};

describe("useSimilarProjects", () => {
  beforeEach(() => {
    mocks.fetchSimilarProjects.mockReset();
  });

  test("fetches with sorted names", async () => {
    mocks.fetchSimilarProjects.mockResolvedValue(["preact"]);
    const { wrapper, queryClient } = createWrapper();

    const { result } = renderHook(() => useSimilarProjects(["vue", "react"]), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mocks.fetchSimilarProjects).toHaveBeenCalledWith(["react", "vue"]);
    expect(queryClient.getQueryCache().getAll()[0]?.queryKey).toEqual([
      "similarProjects",
      "react,vue",
    ]);
  });

  test("is disabled without project names", () => {
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useSimilarProjects([]), { wrapper });

    expect(result.current.fetchStatus).toBe("idle");
    expect(mocks.fetchSimilarProjects).not.toHaveBeenCalled();
  });

  test("retry skips errors mentioning 4 and stops after two failures", () => {
    mocks.fetchSimilarProjects.mockResolvedValue([]);
    const { wrapper, queryClient } = createWrapper();
    renderHook(() => useSimilarProjects(["react"]), { wrapper });

    const { retry } = getObserverOptions(queryClient);
    if (typeof retry !== "function")
      throw new Error("retry must be a function");

    expect(retry(0, new Error("status 404"))).toBe(false);
    expect(retry(0, new Error("boom"))).toBe(true);
    expect(retry(1, new Error("boom"))).toBe(true);
    expect(retry(2, new Error("boom"))).toBe(false);
  });

  test("retryDelay grows exponentially up to 30s", () => {
    mocks.fetchSimilarProjects.mockResolvedValue([]);
    const { wrapper, queryClient } = createWrapper();
    renderHook(() => useSimilarProjects(["react"]), { wrapper });

    const { retryDelay } = getObserverOptions(queryClient);
    if (typeof retryDelay !== "function")
      throw new Error("retryDelay must be a function");

    expect(retryDelay(0, new Error("x"))).toBe(1000);
    expect(retryDelay(3, new Error("x"))).toBe(8000);
    expect(retryDelay(10, new Error("x"))).toBe(30000);
  });
});
