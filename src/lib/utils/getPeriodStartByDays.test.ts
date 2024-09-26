import { describe, expect, it } from "vitest";
import { getPeriodStartByDays } from "./getPeriodStartByDays";

describe("getPeriodStartByDays", () => {
  it("should return the correct period start date for a 7-day period", () => {
    const date = new Date(2023, 0, 4); // January 4, 2023
    const periodLength = 7;
    const expected = new Date(2022, 11, 29); // December 29, 2022
    const result = getPeriodStartByDays(date, periodLength);
    expect(result).toEqual(expected);
  });

  it("should return the correct period start date for a 30-day period", () => {
    const date = new Date(2023, 1, 21); // February 21, 2023
    const periodLength = 30;
    const expected = new Date(2023, 0, 23); // January 23, 2023
    const result = getPeriodStartByDays(date, periodLength);
    expect(result).toEqual(expected);
  });

  it("should handle leap years correctly", () => {
    const date = new Date(2024, 1, 29); // February 29, 2024 (leap year)
    const periodLength = 15;
    const expected = new Date(2024, 1, 17); // February 17, 2024
    const result = getPeriodStartByDays(date, periodLength);
    expect(result).toEqual(expected);
  });

  it("should work correctly across year boundaries", () => {
    const date = new Date(2024, 0, 2); // January 2, 2024
    const periodLength = 10;
    const expected = new Date(2023, 11, 29); // December 29, 2023
    const result = getPeriodStartByDays(date, periodLength);
    expect(result).toEqual(expected);
  });

  it("should return the correct date when it falls on the period start", () => {
    const date = new Date(2023, 0, 5); // January 5, 2023
    const periodLength = 7;
    const result = getPeriodStartByDays(date, periodLength);
    expect(result).toEqual(date);
  });
});
