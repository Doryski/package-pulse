import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const loadHook = async () => (await import("./useFavorites")).default;

describe("useFavorites", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetModules();
  });

  it("adds favorites order-insensitively", async () => {
    const useFavorites = await loadHook();
    const { result } = renderHook(() => useFavorites());

    act(() => result.current.addFavorite(["react", "vue"]));

    expect(result.current.isFavorite(["vue", "react"])).toBe(true);
  });

  it("toggles a favorite on then off", async () => {
    const useFavorites = await loadHook();
    const { result } = renderHook(() => useFavorites());

    act(() => result.current.toggleFavorite(["react", "vue"]));
    expect(result.current.isFavorite(["react", "vue"])).toBe(true);

    act(() => result.current.toggleFavorite(["vue", "react"]));
    expect(result.current.isFavorite(["react", "vue"])).toBe(false);
  });

  it("does not store duplicates for reordered selections", async () => {
    const useFavorites = await loadHook();
    const { result } = renderHook(() => useFavorites());

    act(() => result.current.addFavorite(["react", "vue"]));
    act(() => result.current.addFavorite(["vue", "react"]));

    expect(result.current.favorites).toHaveLength(1);
  });
});
