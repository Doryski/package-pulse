import { calculateBreakDrop } from "@/lib/utils/calculateBreakDrop";
import { buildProjectStats, buildSuccessQuery } from "@/test/factories";
import { act, renderHook } from "@testing-library/react";
import { ThemeProvider, useTheme } from "next-themes";
import { createElement, PropsWithChildren } from "react";
import { describe, expect, test, vi } from "vitest";
import useStatsMatrix from "./useStatsMatrix";

vi.mock("@/lib/utils/calculateBreakDrop", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/lib/utils/calculateBreakDrop")>();
  return { ...actual, calculateBreakDrop: vi.fn(actual.calculateBreakDrop) };
});

const ThemeWrapper = ({ children }: PropsWithChildren) =>
  createElement(ThemeProvider, { attribute: "class" }, children);

const buildQueries = (count: number) =>
  Array.from({ length: count }, (_, index) =>
    buildSuccessQuery(buildProjectStats(`pkg-${index}`, { days: 60 })),
  );

describe("useStatsMatrix", () => {
  test("builds a row per project with data", () => {
    const queries = [
      buildSuccessQuery(buildProjectStats("react", { days: 60 })),
      buildSuccessQuery(buildProjectStats("vue", { days: 60 })),
    ];

    const { result } = renderHook(() => useStatsMatrix(queries));

    expect(result.current.stats.map((row) => row.projectName)).toEqual([
      "react",
      "vue",
    ]);
  });

  test("returns no rows for no projects", () => {
    const { result } = renderHook(() => useStatsMatrix([]));

    expect(result.current.stats).toEqual([]);
  });

  test("memoizes while inputs are unchanged", () => {
    const queries = buildQueries(1);
    const { result, rerender } = renderHook(() => useStatsMatrix(queries));
    const first = result.current;

    rerender();

    expect(result.current).toBe(first);
  });

  test("shares one matrix between consumers of the same stats array", () => {
    const queries = buildQueries(2);

    const first = renderHook(() => useStatsMatrix(queries)).result.current;
    const second = renderHook(() => useStatsMatrix(queries)).result.current;

    expect(second).toBe(first);
  });

  test("keeps the matrix and skips break-drop work on a theme toggle with 10 packages", () => {
    const queries = buildQueries(10);
    vi.mocked(calculateBreakDrop).mockClear();
    const { result } = renderHook(
      () => ({ theme: useTheme(), matrix: useStatsMatrix(queries) }),
      { wrapper: ThemeWrapper },
    );
    const before = result.current.matrix;

    act(() => result.current.theme.setTheme("dark"));

    expect(result.current.theme.theme).toBe("dark");
    expect(result.current.matrix).toBe(before);
    expect(result.current.matrix.stats[0]?.color).toBe("hsl(var(--chart-1))");
    expect(calculateBreakDrop).not.toHaveBeenCalled();
  });
});
