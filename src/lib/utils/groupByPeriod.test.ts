import {
  addDays,
  addMonths,
  addWeeks,
  addYears,
  differenceInCalendarDays,
  differenceInCalendarMonths,
  differenceInCalendarWeeks,
  differenceInCalendarYears,
  format,
  startOfMonth,
  startOfWeek,
  startOfYear,
} from "date-fns";
import { describe, expect, it } from "vitest";
import groupByPeriod, {
  calculatePeriodStartDate,
  updateGroupedStats,
} from "./groupByPeriod";

describe("groupByPeriod", () => {
  it("should group daily stats correctly", () => {
    const stats = [
      { date: "2023-01-01", count: 1 },
      { date: "2023-01-01", count: 2 },
      { date: "2023-01-02", count: 3 },
      { date: "2023-01-03", count: 4 },
    ];

    const result = groupByPeriod(stats, 1, addDays, differenceInCalendarDays);

    expect(result).toEqual([
      { date: "2023-01-01", count: 3 },
      { date: "2023-01-02", count: 3 },
      { date: "2023-01-03", count: 4 },
    ]);
  });

  it("should group stats by custom period length", () => {
    const stats = [
      { date: "2023-01-01", count: 1 },
      { date: "2023-01-02", count: 2 },
      { date: "2023-01-03", count: 3 },
      { date: "2023-01-04", count: 4 },
      { date: "2023-01-05", count: 5 },
    ];

    const result = groupByPeriod(stats, 2, addDays, differenceInCalendarDays);

    expect(result).toEqual([
      { date: "2023-01-01", count: 3 },
      { date: "2023-01-03", count: 7 },
      { date: "2023-01-05", count: 5 },
    ]);
  });

  it("should group monthly stats correctly", () => {
    const stats = [
      { date: "2023-01-15", count: 1 },
      { date: "2023-01-31", count: 2 },
      { date: "2023-02-01", count: 3 },
      { date: "2023-03-01", count: 4 },
    ];

    const result = groupByPeriod(
      stats,
      1,
      addMonths,
      differenceInCalendarMonths,
      startOfMonth,
    );

    expect(result).toEqual([
      { date: "2023-01-01", count: 3 },
      { date: "2023-02-01", count: 3 },
      { date: "2023-03-01", count: 4 },
    ]);
  });

  it("should handle empty input", () => {
    const stats: { date: string; count: number }[] = [];

    const result = groupByPeriod(stats, 1, addDays, differenceInCalendarDays);

    expect(result).toEqual([]);
  });

  it("should handle single item input", () => {
    const stats = [{ date: "2023-01-01", count: 5 }];

    const result = groupByPeriod(stats, 1, addDays, differenceInCalendarDays);

    expect(result).toEqual([{ date: "2023-01-01", count: 5 }]);
  });
});

describe("calculatePeriodStartDate", () => {
  it("should calculate correct start date for daily periods", () => {
    const result = calculatePeriodStartDate(
      "2023-05-15",
      1,
      (date) => date,
      differenceInCalendarDays,
      addDays,
    );
    expect(format(result, "yyyy-MM-dd")).toEqual("2023-05-15");
  });

  it("should calculate correct start date for 3-day periods", () => {
    const result = calculatePeriodStartDate(
      "2023-05-16",
      3,
      undefined,
      differenceInCalendarDays,
      addDays,
    );

    expect(format(result, "yyyy-MM-dd")).toEqual("2023-05-14");
  });

  it("should calculate correct start date for weekly periods", () => {
    const result = calculatePeriodStartDate(
      "2023-05-15",
      1,
      startOfWeek,
      differenceInCalendarWeeks,
      addWeeks,
    );
    expect(format(result, "yyyy-MM-dd")).toEqual("2023-05-14");
  });

  it("should calculate correct start date for monthly periods", () => {
    const result = calculatePeriodStartDate(
      "2023-05-15",
      1,
      startOfMonth,
      differenceInCalendarMonths,
      addMonths,
    );
    expect(format(result, "yyyy-MM-dd")).toEqual("2023-05-01");
  });

  it("should calculate correct start date for yearly periods", () => {
    const result = calculatePeriodStartDate(
      "2023-05-15",
      1,
      startOfYear,
      differenceInCalendarYears,
      addYears,
    );
    expect(format(result, "yyyy-MM-dd")).toEqual("2023-01-01");
  });

  it("should handle leap years correctly", () => {
    const result = calculatePeriodStartDate(
      "2024-02-29",
      1,
      startOfYear,
      differenceInCalendarYears,
      addYears,
    );
    expect(format(result, "yyyy-MM-dd")).toEqual("2024-01-01");
  });
});

describe("updateGroupedStats", () => {
  it("should create a new entry if the periodKey does not exist", () => {
    const grouped: Record<string, { date: string; count: number }> = {};
    const periodKey = "2023-04-15";
    const count = 5;

    updateGroupedStats(grouped, periodKey, count);

    expect(grouped[periodKey]).toEqual({ date: periodKey, count: 5 });
  });

  it("should update an existing entry if the periodKey exists", () => {
    const grouped: Record<string, { date: string; count: number }> = {
      "2023-04-15": { date: "2023-04-15", count: 3 },
    };
    const periodKey = "2023-04-15";
    const count = 2;

    updateGroupedStats(grouped, periodKey, count);

    expect(grouped[periodKey]).toEqual({ date: periodKey, count: 5 });
  });

  it("should handle multiple updates to the same periodKey", () => {
    const grouped: Record<string, { date: string; count: number }> = {};
    const periodKey = "2023-04-15";

    updateGroupedStats(grouped, periodKey, 3);
    updateGroupedStats(grouped, periodKey, 2);
    updateGroupedStats(grouped, periodKey, 1);

    expect(grouped[periodKey]).toEqual({ date: periodKey, count: 6 });
  });

  it("should handle updates to multiple periodKeys", () => {
    const grouped: Record<string, { date: string; count: number }> = {};

    updateGroupedStats(grouped, "2023-04-15", 3);
    updateGroupedStats(grouped, "2023-04-16", 2);
    updateGroupedStats(grouped, "2023-04-15", 1);

    expect(grouped["2023-04-15"]).toEqual({ date: "2023-04-15", count: 4 });
    expect(grouped["2023-04-16"]).toEqual({ date: "2023-04-16", count: 2 });
  });
});
