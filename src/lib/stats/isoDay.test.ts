import { describe, expect, it } from "vitest";
import {
  daysInMonth,
  fromDayNumber,
  isWeekend,
  isWithinIsoRange,
  subtractIsoYear,
  toDayNumber,
  weekdayOf,
  weekdayOfDayNumber,
} from "./isoDay";

describe("isoDay", () => {
  it("round-trips ISO dates through day numbers", () => {
    expect(toDayNumber("1970-01-01")).toBe(0);
    expect(fromDayNumber(toDayNumber("2024-02-29") + 1)).toBe("2024-03-01");
    expect(fromDayNumber(-1)).toBe("1969-12-31");
  });

  it("computes weekdays with sunday as zero", () => {
    expect(weekdayOf("2024-01-07")).toBe(0);
    expect(weekdayOf("2024-01-08")).toBe(1);
    expect(weekdayOf("2024-01-13")).toBe(6);
    expect(weekdayOfDayNumber(-1)).toBe(3);
  });

  it("flags saturday and sunday as weekend", () => {
    expect([0, 1, 5, 6].map(isWeekend)).toEqual([true, false, false, true]);
  });

  it("returns the number of days in a month", () => {
    expect(daysInMonth("2023-02")).toBe(28);
    expect(daysInMonth("2024-02")).toBe(29);
    expect(daysInMonth("2024-12")).toBe(31);
  });

  it("checks inclusive ISO ranges", () => {
    expect(isWithinIsoRange("2024-01-01", "2024-01-01", "2024-01-07")).toBe(
      true,
    );
    expect(isWithinIsoRange("2024-01-08", "2024-01-01", "2024-01-07")).toBe(
      false,
    );
  });

  it("subtracts a year clamping leap days", () => {
    expect(subtractIsoYear("2025-10-26")).toBe("2024-10-26");
    expect(subtractIsoYear("2024-02-29")).toBe("2023-02-28");
  });
});
