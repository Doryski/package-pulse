import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { buildProjectStats, buildSuccessQuery } from "@/test/factories";
import useStatsMatrix from "./useStatsMatrix";

const mocks = vi.hoisted(() => ({
  useTheme: vi.fn(),
}));

vi.mock("next-themes", () => ({
  useTheme: mocks.useTheme,
}));

describe("useStatsMatrix", () => {
  beforeEach(() => {
    mocks.useTheme.mockReturnValue({ resolvedTheme: "light" });
  });

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
    const queries = [buildSuccessQuery(buildProjectStats("react"))];
    const { result, rerender } = renderHook(() => useStatsMatrix(queries));
    const first = result.current;

    rerender();

    expect(result.current).toBe(first);
  });

  test("recomputes colors when the resolved theme changes", () => {
    const queries = [buildSuccessQuery(buildProjectStats("react"))];
    const { result, rerender } = renderHook(() => useStatsMatrix(queries));
    const lightColor = result.current.stats[0]?.color;

    mocks.useTheme.mockReturnValue({ resolvedTheme: "dark" });
    rerender();

    expect(result.current.stats[0]?.color).not.toBe(lightColor);
  });
});
