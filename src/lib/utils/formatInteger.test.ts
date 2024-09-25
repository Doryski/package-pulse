import { describe, expect, it } from "vitest";
import formatInteger from "./formatInteger";

// Helper function to create a string with non-breaking spaces
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
    expect(formatInteger(-1000.5)).toBe(nbsp("-1 000"));
    expect(formatInteger(1000.4)).toBe(nbsp("1 000"));
    expect(formatInteger(-1000.6)).toBe(nbsp("-1 001"));
  });
});
