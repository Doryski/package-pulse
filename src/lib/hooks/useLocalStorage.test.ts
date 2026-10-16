import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, test } from "vitest";
import useLocalStorage from "./useLocalStorage";

describe("useLocalStorage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test("stores the JSON serialized value", () => {
    renderHook(() => useLocalStorage("key", { a: 1 }));

    expect(localStorage.getItem("key")).toBe('{"a":1}');
  });

  test("updates the stored value when it changes", () => {
    const { rerender } = renderHook(
      ({ value }) => useLocalStorage("key", value),
      { initialProps: { value: "one" } },
    );

    rerender({ value: "two" });

    expect(localStorage.getItem("key")).toBe('"two"');
  });

  test("writes under the new key when the key changes", () => {
    const { rerender } = renderHook(
      ({ storageKey }) => useLocalStorage(storageKey, 5),
      { initialProps: { storageKey: "first" } },
    );

    rerender({ storageKey: "second" });

    expect(localStorage.getItem("second")).toBe("5");
  });
});
