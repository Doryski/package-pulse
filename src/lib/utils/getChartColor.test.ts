import { describe, expect, it } from "vitest";
import { colors } from "../theme/colors";
import getChartColor from "./getChartColor";

describe("getChartColor", () => {
  it("returns the correct color for light theme", () => {
    expect(getChartColor("light", 0)).toBe(colors.chart.light[1]);
    expect(getChartColor("light", 4)).toBe(colors.chart.light[5]);
    expect(getChartColor("light", 9)).toBe(colors.chart.light[10]);
  });

  it("returns the correct color for dark theme", () => {
    expect(getChartColor("dark", 0)).toBe(colors.chart.dark[1]);
    expect(getChartColor("dark", 4)).toBe(colors.chart.dark[5]);
    expect(getChartColor("dark", 9)).toBe(colors.chart.dark[10]);
  });

  it("returns the correct color for light theme with quotes", () => {
    expect(getChartColor('"light"', 0)).toBe(colors.chart.light[1]);
    expect(getChartColor('"light"', 4)).toBe(colors.chart.light[5]);
    expect(getChartColor('"light"', 9)).toBe(colors.chart.light[10]);
  });

  it("returns the correct color for dark theme with quotes", () => {
    expect(getChartColor('"dark"', 0)).toBe(colors.chart.dark[1]);
    expect(getChartColor('"dark"', 4)).toBe(colors.chart.dark[5]);
    expect(getChartColor('"dark"', 9)).toBe(colors.chart.dark[10]);
  });

  it("returns undefined for invalid theme", () => {
    expect(getChartColor("invalid", 0)).toBeUndefined();
  });

  it("returns undefined for out of range index", () => {
    expect(getChartColor("light", 10)).toBeUndefined();
    expect(getChartColor("dark", -1)).toBeUndefined();
  });

  it("returns undefined for undefined theme", () => {
    expect(getChartColor(undefined, 0)).toBeUndefined();
  });
});
