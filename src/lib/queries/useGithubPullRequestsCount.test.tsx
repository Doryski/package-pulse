import { createTestQueryClient } from "@/test/render";
import { QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { PropsWithChildren } from "react";
import { beforeEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({ fetchGithubPullRequestsCount: vi.fn() }));

vi.mock("@/api/fetchPackageInfo", () => ({
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

  test("returns the count with the project name", async () => {
    mocks.fetchGithubPullRequestsCount.mockResolvedValue(42);

    const { result } = renderHook(
      () => useGithubPullRequestsCount("facebook/react", "react", true),
      { wrapper },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mocks.fetchGithubPullRequestsCount).toHaveBeenCalledWith(
      "facebook/react",
    );
    expect(result.current.data).toEqual({ count: 42, name: "react" });
  });

  test("does not fetch when disabled", () => {
    const { result } = renderHook(
      () => useGithubPullRequestsCount("facebook/react", "react", false),
      { wrapper },
    );

    expect(result.current.fetchStatus).toBe("idle");
    expect(mocks.fetchGithubPullRequestsCount).not.toHaveBeenCalled();
  });
});
