import { createTestQueryClient } from "@/test/render";
import { QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { PropsWithChildren } from "react";
import { beforeEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({ fetchGithubPullRequestsCount: vi.fn() }));

vi.mock("@/api/packageData", () => ({
  fetchGithubPullRequestsCount: mocks.fetchGithubPullRequestsCount,
}));

import useGithubPullRequestsCount from "./useGithubPullRequestsCount";

const wrapper = ({ children }: PropsWithChildren) => (
  <QueryClientProvider client={createTestQueryClient()}>
    {children}
  </QueryClientProvider>
);

describe("useGithubPullRequestsCount", () => {
  beforeEach(() => {
    mocks.fetchGithubPullRequestsCount.mockReset();
  });

  test("returns the count for the repo", async () => {
    mocks.fetchGithubPullRequestsCount.mockResolvedValue(42);

    const { result } = renderHook(
      () => useGithubPullRequestsCount("facebook/react"),
      { wrapper },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mocks.fetchGithubPullRequestsCount).toHaveBeenCalledWith(
      "facebook/react",
      expect.any(AbortSignal),
    );
    expect(result.current.data).toBe(42);
  });

  test.each([null, undefined, ""])(
    "does not fetch without a repo name (%s)",
    (repoName) => {
      const { result } = renderHook(
        () => useGithubPullRequestsCount(repoName),
        { wrapper },
      );

      expect(result.current.fetchStatus).toBe("idle");
      expect(mocks.fetchGithubPullRequestsCount).not.toHaveBeenCalled();
    },
  );
});
