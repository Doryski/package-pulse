import { isClientError } from "@/lib/utils/AppError";
import { createTestQueryClient } from "@/test/render";
import { QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { PropsWithChildren } from "react";
import { afterEach, describe, expect, test, vi } from "vitest";
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

const stubFetch = (response: Response) => {
  const fetchMock = vi.fn().mockResolvedValue(response);
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
};

describe("useSimilarProjects", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test("fetches the same-origin route with sorted names and the query signal", async () => {
    const fetchMock = stubFetch(Response.json({ similarProjects: ["preact"] }));
    const { wrapper, queryClient } = createWrapper();

    const { result } = renderHook(() => useSimilarProjects(["vue", "react"]), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(["preact"]);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/similar-projects?packages=react%2Cvue",
      { signal: expect.any(AbortSignal) },
    );
    expect(queryClient.getQueryCache().getAll()[0]?.queryKey).toEqual([
      "similarProjects",
      "react,vue",
    ]);
  });

  test("is disabled without project names", () => {
    const fetchMock = stubFetch(Response.json({ similarProjects: [] }));
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useSimilarProjects([]), { wrapper });

    expect(result.current.fetchStatus).toBe("idle");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test("surfaces non-ok responses as AppError with the status", async () => {
    stubFetch(Response.json({ error: "Invalid packages." }, { status: 400 }));
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useSimilarProjects(["react"]), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(isClientError(result.current.error)).toBe(true);
  });

  test("errors on a malformed body", async () => {
    stubFetch(Response.json({ similarProjects: "vue" }));
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useSimilarProjects(["react"]), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  test("does not retry and keeps a 24h stale time", () => {
    stubFetch(Response.json({ similarProjects: [] }));
    const { wrapper, queryClient } = createWrapper();
    renderHook(() => useSimilarProjects(["react"]), { wrapper });

    const options = getObserverOptions(queryClient);

    expect(options.retry).toBe(false);
    expect(options.staleTime).toBe(1000 * 60 * 60 * 24);
  });
});
