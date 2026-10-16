import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, test } from "vitest";
import LocalStorageKey from "../enums/LocalStorageKey";
import useTableSort, {
  getNextTableSort,
  TABLE_SORT_DEFAULT,
} from "./useTableSort";

describe("getNextTableSort", () => {
  test("flips desc to asc for the same column", () => {
    expect(
      getNextTableSort({ column: "weekly", direction: "desc" }, "weekly"),
    ).toEqual({ column: "weekly", direction: "asc" });
  });

  test("flips asc to desc for the same column", () => {
    expect(
      getNextTableSort({ column: "weekly", direction: "asc" }, "weekly"),
    ).toEqual({ column: "weekly", direction: "desc" });
  });

  test("starts a new column in desc", () => {
    expect(
      getNextTableSort({ column: "weekly", direction: "asc" }, "monthly"),
    ).toEqual({ column: "monthly", direction: "desc" });
  });
});

describe("useTableSort", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test("falls back to defaults when nothing is stored", () => {
    const { result } = renderHook(() => useTableSort());

    expect(result.current.sortColumn).toBe(TABLE_SORT_DEFAULT.column);
    expect(result.current.sortDirection).toBe(TABLE_SORT_DEFAULT.direction);
  });

  test("restores stored column and direction", () => {
    localStorage.setItem(
      LocalStorageKey.TABLE_SORT_COLUMN,
      JSON.stringify("projectName"),
    );
    localStorage.setItem(
      LocalStorageKey.TABLE_SORT_DIRECTION,
      JSON.stringify("asc"),
    );

    const { result } = renderHook(() => useTableSort());

    expect(result.current.sortColumn).toBe("projectName");
    expect(result.current.sortDirection).toBe("asc");
  });

  test("falls back to defaults for invalid stored values", () => {
    localStorage.setItem(
      LocalStorageKey.TABLE_SORT_COLUMN,
      JSON.stringify("nonexistent"),
    );
    localStorage.setItem(LocalStorageKey.TABLE_SORT_DIRECTION, "{not json");

    const { result } = renderHook(() => useTableSort());

    expect(result.current.sortColumn).toBe(TABLE_SORT_DEFAULT.column);
    expect(result.current.sortDirection).toBe(TABLE_SORT_DEFAULT.direction);
  });

  test("toggles direction when sorting the active column", () => {
    const { result } = renderHook(() => useTableSort());

    act(() => result.current.handleSort(TABLE_SORT_DEFAULT.column));

    expect(result.current.sortColumn).toBe(TABLE_SORT_DEFAULT.column);
    expect(result.current.sortDirection).toBe("asc");
  });

  test("switches column and resets direction to desc", () => {
    const { result } = renderHook(() => useTableSort());

    act(() => result.current.handleSort(TABLE_SORT_DEFAULT.column));
    act(() => result.current.handleSort("yearly"));

    expect(result.current.sortColumn).toBe("yearly");
    expect(result.current.sortDirection).toBe("desc");
  });

  test("persists the sort to localStorage", () => {
    const { result } = renderHook(() => useTableSort());

    act(() => result.current.handleSort("monthly"));
    act(() => result.current.handleSort("monthly"));

    expect(localStorage.getItem(LocalStorageKey.TABLE_SORT_COLUMN)).toBe(
      '"monthly"',
    );
    expect(localStorage.getItem(LocalStorageKey.TABLE_SORT_DIRECTION)).toBe(
      '"asc"',
    );
  });

  test("keeps handleSort stable across renders", () => {
    const { result, rerender } = renderHook(() => useTableSort());
    const { handleSort } = result.current;

    rerender();

    expect(result.current.handleSort).toBe(handleSort);
  });
});
