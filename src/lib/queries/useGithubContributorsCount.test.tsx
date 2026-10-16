import { createTestQueryClient } from "@/test/render";
import { QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { PropsWithChildren } from "react";
import { beforeEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({ fetchContributorsCount: vi.fn() }));

vi.mock("@/api/fetchPackageInfo", () => ({
  fetchContributorsCount: mocks.fetchContributorsCount,
}));

import useGithubContributorsCount from "./useGithubContributorsCount";

const wrapper = ({ children }: PropsWithChildren) => (
  <QueryClientProvider client={createTestQueryClient()}>
    {children}
  </QueryClientProvider>
);

describe("useGithubContributorsCount", () => {
  beforeEach(() => {
    mocks.fetchContributorsCount.mockReset();
  });

  test("returns the count with the project name", async () => {
    mocks.fetchContributorsCount.mockResolvedValue(42);

    const { result } = renderHook(
      () => useGithubContributorsCount("facebook/react", "react", true),
      { wrapper },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mocks.fetchContributorsCount).toHaveBeenCalledWith("facebook/react");
    expect(result.current.data).toEqual({ count: 42, name: "react" });
  });

  test("does not fetch when disabled", () => {
    const { result } = renderHook(
      () => useGithubContributorsCount("facebook/react", "react", false),
      { wrapper },
    );

    expect(result.current.fetchStatus).toBe("idle");
    expect(mocks.fetchContributorsCount).not.toHaveBeenCalled();
  });
});
