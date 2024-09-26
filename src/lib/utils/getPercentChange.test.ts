import { describe, expect, it } from "vitest";
import getPercentChange from "./getPercentChange";

describe("getPercentChange", () => {
  it("calculates positive percent change correctly", () => {
    expect(getPercentChange(110, 100)).toBeCloseTo(10);
  });

  it("calculates negative percent change correctly", () => {
    expect(getPercentChange(90, 100)).toBeCloseTo(-10);
  });

  it("returns 0 when current and previous values are the same", () => {
    expect(getPercentChange(100, 100)).toBe(0);
  });

  it("handles decimal values", () => {
    expect(getPercentChange(1.5, 1)).toBeCloseTo(50);
  });

  it("handles large numbers", () => {
    expect(getPercentChange(1000000, 500000)).toBeCloseTo(100);
  });

  it("handles very small numbers", () => {
    expect(getPercentChange(0.002, 0.001)).toBeCloseTo(100);
  });

  it("returns Infinity when previous value is 0", () => {
    expect(getPercentChange(100, 0)).toBe(Infinity);
  });

  it("returns -100 when current value is 0", () => {
    expect(getPercentChange(0, 100)).toBe(-100);
  });
});
