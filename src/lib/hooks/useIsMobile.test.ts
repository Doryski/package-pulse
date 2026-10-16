import { act, renderHook } from "@testing-library/react";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { useIsMobile } from "./useIsMobile";

type ChangeListener = () => void;

const mockMatchMedia = (initialMatches: boolean) => {
  const state = { matches: initialMatches };
  const listeners = new Set<ChangeListener>();
  const addEventListener = vi.fn((_: string, listener: ChangeListener) => {
    listeners.add(listener);
  });
  const removeEventListener = vi.fn((_: string, listener: ChangeListener) => {
    listeners.delete(listener);
  });
  const matchMedia = vi.fn((query: string) => ({
    get matches() {
      return state.matches;
    },
    media: query,
    addEventListener,
    removeEventListener,
  }));
  vi.stubGlobal("matchMedia", matchMedia);

  return {
    matchMedia,
    addEventListener,
    removeEventListener,
    listeners,
    setMatches: (matches: boolean) => {
      state.matches = matches;
      listeners.forEach((listener) => listener());
    },
  };
};

describe("useIsMobile", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  test("returns true when the viewport matches the default breakpoint", () => {
    const media = mockMatchMedia(true);

    const { result } = renderHook(() => useIsMobile());

    expect(result.current).toBe(true);
    expect(media.matchMedia).toHaveBeenCalledWith("(max-width: 767px)");
  });

  test("returns false when the viewport does not match", () => {
    mockMatchMedia(false);

    const { result } = renderHook(() => useIsMobile());

    expect(result.current).toBe(false);
  });

  test("uses a custom breakpoint", () => {
    const media = mockMatchMedia(false);

    renderHook(() => useIsMobile(1024));

    expect(media.matchMedia).toHaveBeenCalledWith("(max-width: 1023px)");
  });

  test("reacts to media query change events", () => {
    const media = mockMatchMedia(false);
    const { result } = renderHook(() => useIsMobile());

    act(() => media.setMatches(true));
    expect(result.current).toBe(true);

    act(() => media.setMatches(false));
    expect(result.current).toBe(false);
  });

  test("removes the change listener on unmount", () => {
    const media = mockMatchMedia(false);
    const { unmount } = renderHook(() => useIsMobile());

    unmount();

    expect(media.removeEventListener).toHaveBeenCalledWith(
      "change",
      expect.any(Function),
    );
    expect(media.listeners.size).toBe(0);
  });

  test("renders undefined on the server", () => {
    mockMatchMedia(true);
    const Probe = () => String(useIsMobile());

    expect(renderToString(createElement(Probe))).toBe("undefined");
  });
});
