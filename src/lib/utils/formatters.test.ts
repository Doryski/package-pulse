import { describe, expect, it } from "vitest";
import { formatCellValue, formatInteger } from "./formatters";

/**
 * Create a string with non-breaking spaces
 */
const nbsp = (str: string) => str.replace(/ /g, "\u00A0");

describe("formatInteger", () => {
  it("formats positive integers correctly", () => {
    expect(formatInteger(1000)).toBe(nbsp("1 000"));
    expect(formatInteger(1000000)).toBe(nbsp("1 000 000"));
    expect(formatInteger(1234567)).toBe(nbsp("1 234 567"));
  });

  it("formats negative integers correctly", () => {
    expect(formatInteger(-1000)).toBe(nbsp("-1 000"));
    expect(formatInteger(-1000000)).toBe(nbsp("-1 000 000"));
    expect(formatInteger(-1234567)).toBe(nbsp("-1 234 567"));
  });

  it("handles zero correctly", () => {
    expect(formatInteger(0)).toBe("0");
    expect(formatInteger(0.0)).toBe("0");
    expect(formatInteger(-0)).toBe("0");
    expect(formatInteger(-0.0)).toBe("0");
  });

  it("handles large numbers correctly", () => {
    expect(formatInteger(1000000000)).toBe(nbsp("1 000 000 000"));
    expect(formatInteger(-1000000000)).toBe(nbsp("-1 000 000 000"));
  });

  it("handles small numbers correctly", () => {
    expect(formatInteger(1)).toBe("1");
    expect(formatInteger(-1)).toBe("-1");
  });

  it("rounds floating point numbers to integers", () => {
    expect(formatInteger(1000.5)).toBe(nbsp("1 001"));
    expect(formatInteger(-1000.5)).toBe(nbsp("-1 001"));
    expect(formatInteger(1000.4)).toBe(nbsp("1 000"));
    expect(formatInteger(-1000.6)).toBe(nbsp("-1 001"));
  });
});

describe("formatCellValue", () => {
  it("should format non-null values using the provided formatter", () => {
    const formatter = (value: number) => `$${value.toFixed(2)}`;
    const result = formatCellValue(10, formatter);
    expect(result).toBe("$10.00");
  });

  it('should return "-" for null values', () => {
    const formatter = (value: string) => value.toUpperCase();
    const result = formatCellValue(null, formatter);
    expect(result).toBe("-");
  });

  it('should return "-" for undefined values', () => {
    const formatter = (value: boolean) => value.toString();
    const result = formatCellValue(undefined, formatter);
    expect(result).toBe("-");
  });

  it("should handle falsy values correctly", () => {
    const formatter = (value: number) => value.toString();
    expect(formatCellValue(0, formatter)).toBe("0");
    expect(formatCellValue("", (v: string) => v.toUpperCase())).toBe("");
    expect(formatCellValue(false, (v: boolean) => v.toString())).toBe("false");
  });

  it("should work with complex objects", () => {
    const formatter = (value: { name: string; age: number }) =>
      `${value.name} (${value.age})`;
    const result = formatCellValue({ name: "John", age: 30 }, formatter);
    expect(result).toBe("John (30)");
  });
});
