import { describe, expect, test } from "vitest";
import { average, max, round, sum } from "./math";

describe("math", () => {
  describe("max", () => {
    test("returns item with maximum value", () => {
      const numbers = [1, 5, 3, 9, 2];
      expect(max(numbers, (x) => x)).toBe(9);
    });

    test("works with objects", () => {
      const people = [
        { name: "Alice", age: 30 },
        { name: "Bob", age: 25 },
        { name: "Charlie", age: 35 },
      ];
      expect(max(people, (p) => p.age)).toEqual({ name: "Charlie", age: 35 });
    });

    test("returns undefined for empty array", () => {
      expect(max([], (x) => x)).toBeUndefined();
    });

    test("returns single item for array with one element", () => {
      expect(max([42], (x) => x)).toBe(42);
    });

    test("handles negative numbers", () => {
      const numbers = [-10, -5, -20, -1];
      expect(max(numbers, (x) => x)).toBe(-1);
    });

    test("works with custom selector functions", () => {
      const words = ["cat", "elephant", "dog", "bird"];
      expect(max(words, (w) => w.length)).toBe("elephant");
    });
  });

  describe("sum", () => {
    test("sums array of numbers", () => {
      const numbers = [1, 2, 3, 4, 5];
      expect(sum(numbers, (x) => x)).toBe(15);
    });

    test("works with objects", () => {
      const items = [{ price: 10 }, { price: 20 }, { price: 30 }];
      expect(sum(items, (item) => item.price)).toBe(60);
    });

    test("returns 0 for empty array", () => {
      expect(sum([], (x) => x)).toBe(0);
    });

    test("returns single value for array with one element", () => {
      expect(sum([42], (x) => x)).toBe(42);
    });

    test("handles negative numbers", () => {
      const numbers = [10, -5, 3, -2];
      expect(sum(numbers, (x) => x)).toBe(6);
    });

    test("works with custom selector functions", () => {
      const words = ["cat", "elephant", "dog"];
      expect(sum(words, (w) => w.length)).toBe(14); // 3 + 8 + 3
    });
  });

  describe("average", () => {
    test("calculates average of numbers", () => {
      const numbers = [2, 4, 6, 8];
      expect(average(numbers, (x) => x)).toBe(5);
    });

    test("works with objects", () => {
      const people = [{ age: 20 }, { age: 30 }, { age: 40 }];
      expect(average(people, (p) => p.age)).toBe(30);
    });

    test("returns single value for array with one element", () => {
      expect(average([42], (x) => x)).toBe(42);
    });

    test("handles decimal results", () => {
      const numbers = [1, 2, 3];
      expect(average(numbers, (x) => x)).toBe(2);
    });

    test("handles negative numbers", () => {
      const numbers = [-10, 0, 10];
      expect(average(numbers, (x) => x)).toBe(0);
    });

    test("works with custom selector functions", () => {
      const words = ["cat", "rabbit", "dog"];
      expect(average(words, (w) => w.length)).toBeCloseTo(4, 2); // (3 + 6 + 3) / 3
    });

    test("returns NaN for empty array", () => {
      expect(average([], (x) => x)).toBeNaN();
    });
  });

  describe("round", () => {
    test("round", () => {
      expect(round(1.234, 1, "up")).toBe(1.3);
      expect(round(1.234, 1, "down")).toBe(1.2);
      expect(round(1.234, 1, "nearest")).toBe(1.2);
      expect(round(1.555, 2, "up")).toBe(1.56);
      expect(round(1.555, 2, "down")).toBe(1.55);
      expect(round(1.555, 2, "nearest")).toBe(1.56);
      expect(round(2.155, 2, "up")).toBe(2.16);
      expect(round(2.155, 2, "down")).toBe(2.15);
      expect(round(2.155, 2, "nearest")).toBe(2.16);
      expect(round(-3.585, 2, "up")).toBe(-3.58);
      expect(round(-3.585, 2, "down")).toBe(-3.59);
      expect(round(-3.585, 2, "nearest")).toBe(-3.59);
      expect(round(0, 0, "up")).toBe(0);
      expect(round(0, 0, "down")).toBe(0);
      expect(round(0, 0, "nearest")).toBe(0);
      expect(round(0.0, 0, "up")).toBe(0);
      expect(round(0.0, 0, "down")).toBe(0);
      expect(round(0.0, 0, "nearest")).toBe(0);
      expect(round(-0.0, 0, "up")).toBe(0);
      expect(round(-0.0, 0, "down")).toBe(0);
      expect(round(-0.0, 0, "nearest")).toBe(0);
    });
  });
});
