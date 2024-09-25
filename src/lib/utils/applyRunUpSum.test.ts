import { describe, expect, it } from "vitest";
import applyRunUpSum from "./applyRunUpSum";

describe("applyRunUpSum", () => {
  it("should correctly calculate run-up sum for a simple numeric property", () => {
    const input = [{ value: 10 }, { value: 20 }, { value: 30 }];
    const result = applyRunUpSum(input, "value");
    expect(result).toEqual([
      { value: 10, runUpValue: 10 },
      { value: 20, runUpValue: 30 },
      { value: 30, runUpValue: 60 },
    ]);
  });

  it("should handle an empty array", () => {
    const input: { value: number }[] = [];
    const result = applyRunUpSum(input, "value");
    expect(result).toEqual([]);
  });

  it("should work with negative numbers", () => {
    const input = [{ amount: -5 }, { amount: 10 }, { amount: -3 }];
    const result = applyRunUpSum(input, "amount");
    expect(result).toEqual([
      { amount: -5, runUpAmount: -5 },
      { amount: 10, runUpAmount: 5 },
      { amount: -3, runUpAmount: 2 },
    ]);
  });

  it("should handle objects with multiple properties", () => {
    const input = [
      { id: 1, count: 5, name: "A" },
      { id: 2, count: 3, name: "B" },
      { id: 3, count: 7, name: "C" },
    ];
    const result = applyRunUpSum(input, "count");
    expect(result).toEqual([
      { id: 1, count: 5, name: "A", runUpCount: 5 },
      { id: 2, count: 3, name: "B", runUpCount: 8 },
      { id: 3, count: 7, name: "C", runUpCount: 15 },
    ]);
  });

  it("should work with decimal numbers", () => {
    const input = [{ value: 1.5 }, { value: 2.7 }, { value: 3.2 }];
    const result = applyRunUpSum(input, "value");
    expect(result).toEqual([
      { value: 1.5, runUpValue: 1.5 },
      { value: 2.7, runUpValue: 4.2 },
      { value: 3.2, runUpValue: 7.4 },
    ]);
  });
});
