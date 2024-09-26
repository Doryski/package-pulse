import { describe, expect, it } from "vitest";
import formatCellValue from "./formatCellValue";

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
