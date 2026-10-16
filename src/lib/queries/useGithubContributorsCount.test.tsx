import { createTestQueryClient } from "@/test/render";
import { QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { PropsWithChildren } from "react";
import { beforeEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({ fetchGithubContributorsCount: vi.fn() }));

vi.mock("@/api/packageData", () => ({
  fetchGithubContributorsCount: mocks.fetchGithubContributorsCount,
}));

import useGithubContributorsCount from "./useGithubContributorsCount";

const wrapper = ({ children }: PropsWithChildren) => (
  <QueryClientProvider client={createTestQueryClient()}>
    {children}
  </QueryClientProvider>
);

describe("useGithubContributorsCount", () => {
  beforeEach(() => {
    mocks.fetchGithubContributorsCount.mockReset();
  });

  test("returns the count for the repo", async () => {
    mocks.fetchGithubContributorsCount.mockResolvedValue(42);

    const { result } = renderHook(
      () => useGithubContributorsCount("facebook/react"),
      { wrapper },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mocks.fetchGithubContributorsCount).toHaveBeenCalledWith(
      "facebook/react",
      expect.any(AbortSignal),
    );
    expect(result.current.data).toBe(42);
  });

  test.each([null, undefined, ""])(
    "does not fetch without a repo name (%s)",
    (repoName) => {
      const { result } = renderHook(
        () => useGithubContributorsCount(repoName),
        { wrapper },
      );

      expect(result.current.fetchStatus).toBe("idle");
      expect(mocks.fetchGithubContributorsCount).not.toHaveBeenCalled();
    },
  );
});
