import { describe, expect, test, vi } from "vitest";
import { getLast5ChristmasYears } from "./calculateBreakDrop";

describe("getLast5ChristmasYears", () => {
  test("should return the last 5 years excluding the current year if the current year is before Christmas", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2024, 11, 23));
    const last5Years = getLast5ChristmasYears();
    expect(last5Years).toEqual([2023, 2022, 2021, 2020, 2019]);
    vi.useRealTimers();
  });

  test("should return the last 5 years including the current year if the current year is after Christmas", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2024, 11, 25));
    const last5Years = getLast5ChristmasYears();
    expect(last5Years).toEqual([2024, 2023, 2022, 2021, 2020]);
    vi.useRealTimers();
  });

  test("should return the last 5 years including the current year if the current year is during Christmas", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2024, 11, 24));
    const last5Years = getLast5ChristmasYears();
    expect(last5Years).toEqual([2024, 2023, 2022, 2021, 2020]);
    vi.useRealTimers();
  });
});
