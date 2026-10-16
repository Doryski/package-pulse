import { act, renderHook } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import useBooleanState from "./useBooleanState";

describe("useBooleanState", () => {
  test("uses the initial value", () => {
    const { result } = renderHook(() => useBooleanState(true));

    expect(result.current[0]).toBe(true);
  });

  test("supports a lazy initial value", () => {
    const { result } = renderHook(() => useBooleanState(() => true));

    expect(result.current[0]).toBe(true);
  });

  test("sets true, sets false and toggles", () => {
    const { result } = renderHook(() => useBooleanState(false));

    act(() => result.current[1]());
    expect(result.current[0]).toBe(true);

    act(() => result.current[2]());
    expect(result.current[0]).toBe(false);

    act(() => result.current[3]());
    expect(result.current[0]).toBe(true);

    act(() => result.current[3]());
    expect(result.current[0]).toBe(false);
  });

  test("keeps stable callbacks across renders", () => {
    const { result, rerender } = renderHook(() => useBooleanState(false));
    const [, setTrue, setFalse, toggle] = result.current;

    rerender();

    expect(result.current[1]).toBe(setTrue);
    expect(result.current[2]).toBe(setFalse);
    expect(result.current[3]).toBe(toggle);
  });
});
