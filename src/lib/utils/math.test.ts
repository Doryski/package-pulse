import { describe, expect, test } from "vitest";
import { round } from "./math";

describe("math", () => {
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
