import { describe, expect, test } from "vitest";
import chartModes, { defaultChartMode } from "./ChartMode";
import chartScales from "./ChartScale";
import timePeriods from "./TimePeriod";

describe("enums", () => {
  test("default chart mode is one of the chart modes", () => {
    expect(chartModes.map((mode) => mode.value)).toContain(defaultChartMode);
  });

  test("chart scales expose linear and logarithmic", () => {
    expect(chartScales.map((scale) => scale.value)).toEqual([
      "linear",
      "logarithmic",
    ]);
  });

  test("time periods have unique values and end with all-time", () => {
    const values = timePeriods.map((period) => period.value);
    expect(new Set(values).size).toBe(values.length);
    expect(values.at(-1)).toBe("all-time");
  });
});
