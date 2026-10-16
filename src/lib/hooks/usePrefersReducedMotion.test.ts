import { act, renderHook } from "@testing-library/react";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { usePrefersReducedMotion } from "./usePrefersReducedMotion";

type ChangeListener = () => void;

const mockMatchMedia = (initialMatches: boolean) => {
  const state = { matches: initialMatches };
  const listeners = new Set<ChangeListener>();
  const removeEventListener = vi.fn((_: string, listener: ChangeListener) => {
    listeners.delete(listener);
  });
  const matchMedia = vi.fn((query: string) => ({
    get matches() {
      return state.matches;
    },
    media: query,
    addEventListener: (_: string, listener: ChangeListener) =>
      listeners.add(listener),
    removeEventListener,
  }));
  vi.stubGlobal("matchMedia", matchMedia);

  return {
    matchMedia,
    removeEventListener,
    listeners,
    setMatches: (matches: boolean) => {
      state.matches = matches;
      listeners.forEach((listener) => listener());
    },
  };
};

describe("usePrefersReducedMotion", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  test("queries the reduced motion media feature", () => {
    const media = mockMatchMedia(true);

    const { result } = renderHook(() => usePrefersReducedMotion());

    expect(result.current).toBe(true);
    expect(media.matchMedia).toHaveBeenCalledWith(
      "(prefers-reduced-motion: reduce)",
    );
  });

  test("returns false when motion is allowed", () => {
    mockMatchMedia(false);

    const { result } = renderHook(() => usePrefersReducedMotion());

    expect(result.current).toBe(false);
  });

  test("reacts to preference changes", () => {
    const media = mockMatchMedia(false);
    const { result } = renderHook(() => usePrefersReducedMotion());

    act(() => media.setMatches(true));
    expect(result.current).toBe(true);

    act(() => media.setMatches(false));
    expect(result.current).toBe(false);
  });

  test("removes the change listener on unmount", () => {
    const media = mockMatchMedia(false);
    const { unmount } = renderHook(() => usePrefersReducedMotion());

    unmount();

    expect(media.removeEventListener).toHaveBeenCalledWith(
      "change",
      expect.any(Function),
    );
    expect(media.listeners.size).toBe(0);
  });

  test("assumes reduced motion on the server", () => {
    mockMatchMedia(false);
    const Probe = () => String(usePrefersReducedMotion());

    expect(renderToString(createElement(Probe))).toBe("true");
  });
});
