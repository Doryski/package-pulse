import type { DepsDevInfo } from "@/api/packageData";
import { createTestQueryClient } from "@/test/render";
import { QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { PropsWithChildren } from "react";
import { beforeEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({ fetchGithubRepoInfo: vi.fn() }));

vi.mock("@/api/packageData", () => ({
  fetchGithubRepoInfo: mocks.fetchGithubRepoInfo,
}));

import useGithubRepoInfo, {
  needsGithubRepoFallback,
} from "./useGithubRepoInfo";

const wrapper = ({ children }: PropsWithChildren) => (
  <QueryClientProvider client={createTestQueryClient()}>
    {children}
  </QueryClientProvider>
);

const DEPS_DEV: DepsDevInfo = {
  version: "1.0.0",
  vulnerabilityCount: 0,
  licenses: ["MIT"],
  healthScore: 7,
  starsCount: 10,
  forksCount: 2,
  openIssuesCount: 3,
  projectId: "github.com/facebook/react",
};

const settled = (data: DepsDevInfo | undefined) => ({
  data,
  isPending: false,
});

describe("needsGithubRepoFallback", () => {
  test.each([
    ["deps.dev is still pending", { data: undefined, isPending: true }, false],
    ["deps.dev has GitHub stats", settled(DEPS_DEV), false],
    [
      "deps.dev has no project",
      settled({ ...DEPS_DEV, projectId: null }),
      true,
    ],
    ["deps.dev has no stars", settled({ ...DEPS_DEV, starsCount: null }), true],
    ["deps.dev failed", settled(undefined), true],
    ["no deps.dev query", undefined, true],
  ])("when %s", (_, depsDev, expected) => {
    expect(needsGithubRepoFallback(depsDev)).toBe(expected);
  });
});

describe("useGithubRepoInfo", () => {
  beforeEach(() => {
    mocks.fetchGithubRepoInfo.mockReset();
  });

  test("falls back to the GitHub repo when deps.dev has no project", async () => {
    mocks.fetchGithubRepoInfo.mockResolvedValue({
      starsCount: 10,
      openIssuesCount: 1,
    });

    const { result } = renderHook(
      () => useGithubRepoInfo("facebook/react", settled(undefined)),
      { wrapper },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mocks.fetchGithubRepoInfo).toHaveBeenCalledWith(
      "facebook/react",
      expect.any(AbortSignal),
    );
    expect(result.current.data).toEqual({ starsCount: 10, openIssuesCount: 1 });
  });

  test("does not fetch when deps.dev already has GitHub stats", () => {
    const { result } = renderHook(
      () => useGithubRepoInfo("facebook/react", settled(DEPS_DEV)),
      { wrapper },
    );

    expect(result.current.fetchStatus).toBe("idle");
    expect(mocks.fetchGithubRepoInfo).not.toHaveBeenCalled();
  });

  test("does not fetch without a repo name", () => {
    const { result } = renderHook(
      () => useGithubRepoInfo(null, settled(undefined)),
      { wrapper },
    );

    expect(result.current.fetchStatus).toBe("idle");
    expect(mocks.fetchGithubRepoInfo).not.toHaveBeenCalled();
  });
});
