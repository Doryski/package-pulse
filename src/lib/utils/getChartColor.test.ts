import { describe, expect, test } from "vitest";
import { CHART_COLOR_COUNT, getChartColorVar } from "./getChartColor";

describe("getChartColorVar", () => {
  test.each([
    [0, "hsl(var(--chart-1))"],
    [4, "hsl(var(--chart-5))"],
    [9, "hsl(var(--chart-10))"],
  ])("maps index %i to its chart CSS variable", (index, expected) => {
    expect(getChartColorVar(index)).toBe(expected);
  });

  test("wraps around after the last chart color", () => {
    expect(getChartColorVar(CHART_COLOR_COUNT)).toBe(getChartColorVar(0));
  });
});
