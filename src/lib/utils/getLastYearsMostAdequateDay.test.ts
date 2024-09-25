import { describe, expect, it } from "vitest";
import getLastYearsMostAdequateDay from "./getLastYearsMostAdequateDay";

describe("getLastYearsMostAdequateDay", () => {
  it("should return the same day of the week from last year when it matches", () => {
    const currentDay = new Date("2023-04-15"); // Saturday
    const result = getLastYearsMostAdequateDay(currentDay);
    expect(result).toEqual(new Date("2022-04-16")); // Saturday
  });

  it("should return the correct day when last year's date is earlier in the week", () => {
    const currentDay = new Date("2023-04-14"); // Friday
    const result = getLastYearsMostAdequateDay(currentDay);
    expect(result).toEqual(new Date("2022-04-15")); // Friday
  });

  it("should return the correct day when last year's date is later in the week", () => {
    const currentDay = new Date("2023-04-16"); // Sunday
    const result = getLastYearsMostAdequateDay(currentDay);
    expect(result).toEqual(new Date("2022-04-17")); // Sunday
  });

  it("should handle leap years correctly", () => {
    const currentDay = new Date("2024-02-29"); // Thursday (leap year)
    const result = getLastYearsMostAdequateDay(currentDay);
    expect(result).toEqual(new Date("2023-03-02")); // Thursday (non-leap year)
  });

  it("should work with string input", () => {
    const currentDay = "2023-04-15";
    const result = getLastYearsMostAdequateDay(currentDay);
    expect(result).toEqual(new Date("2022-04-16"));
  });

  it("should handle year boundary correctly", () => {
    const currentDay = new Date("2023-01-01"); // Sunday
    const result = getLastYearsMostAdequateDay(currentDay);
    expect(result).toEqual(new Date("2022-01-02")); // Sunday
  });
});
