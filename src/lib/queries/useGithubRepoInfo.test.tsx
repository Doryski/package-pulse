import { createTestQueryClient } from "@/test/render";
import { QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { PropsWithChildren } from "react";
import { beforeEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({ fetchGithubRepoInfo: vi.fn() }));

vi.mock("@/api/fetchPackageInfo", () => ({
  fetchGithubRepoInfo: mocks.fetchGithubRepoInfo,
}));

import useGithubRepoInfo from "./useGithubRepoInfo";

const wrapper = ({ children }: PropsWithChildren) => (
  <QueryClientProvider client={createTestQueryClient()}>
    {children}
  </QueryClientProvider>
);

describe("useGithubRepoInfo", () => {
  beforeEach(() => {
    mocks.fetchGithubRepoInfo.mockReset();
  });

  test("returns repo info with the project name", async () => {
    mocks.fetchGithubRepoInfo.mockResolvedValue({ stars: 10 });

    const { result } = renderHook(
      () => useGithubRepoInfo("facebook/react", "react"),
      { wrapper },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({
      info: { stars: 10 },
      name: "react",
    });
  });

  test("does not fetch without a repo name", () => {
    const { result } = renderHook(() => useGithubRepoInfo("", "react"), {
      wrapper,
    });

    expect(result.current.fetchStatus).toBe("idle");
    expect(mocks.fetchGithubRepoInfo).not.toHaveBeenCalled();
  });
});
