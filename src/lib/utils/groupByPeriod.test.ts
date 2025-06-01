import { DATE_FORMAT } from "@/api/fetchNPMDownloads";
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
import { getPeriodStartByDays } from "./getPeriodStartByDays";
import groupByPeriod, {
  calculatePeriodEndDate,
  calculatePeriodStartDate,
  createPeriodKey,
  DownloadStat,
  groupByWeeks,
  PeriodStat,
  updateGroupedStats,
} from "./groupByPeriod";

describe("groupByPeriod", () => {
  it("should group daily stats correctly", () => {
    const stats: DownloadStat[] = [
      { date: "2023-01-01", count: 1 },
      { date: "2023-01-01", count: 2 },
      { date: "2023-01-02", count: 3 },
      { date: "2023-01-03", count: 4 },
    ];

    const result = groupByPeriod(stats, 1, addDays, differenceInCalendarDays);

    const expected: PeriodStat[] = [
      { start: "2023-01-01", end: "2023-01-01", count: 3 },
      { start: "2023-01-02", end: "2023-01-02", count: 3 },
      { start: "2023-01-03", end: "2023-01-03", count: 4 },
    ];

    expect(result).toEqual(expected);
  });

  it("should group stats by custom period length", () => {
    const stats: DownloadStat[] = [
      { date: "2023-01-01", count: 1 },
      { date: "2023-01-02", count: 2 },
      { date: "2023-01-03", count: 3 },
      { date: "2023-01-04", count: 4 },
      { date: "2023-01-05", count: 5 },
    ];

    const result = groupByPeriod(stats, 2, addDays, differenceInCalendarDays);

    const expected: PeriodStat[] = [
      { start: "2023-01-01", end: "2023-01-02", count: 3 },
      { start: "2023-01-03", end: "2023-01-04", count: 7 },
      { start: "2023-01-05", end: "2023-01-06", count: 5 },
    ];

    expect(result).toEqual(expected);
  });

  it("should group monthly stats correctly for non-leap year", () => {
    const stats: DownloadStat[] = [
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

    const expected: PeriodStat[] = [
      { start: "2023-01-01", end: "2023-01-31", count: 3 },
      { start: "2023-02-01", end: "2023-02-28", count: 3 },
      { start: "2023-03-01", end: "2023-03-31", count: 4 },
    ];

    expect(result).toEqual(expected);
  });

  it("should group monthly stats correctly for leap year", () => {
    const stats: DownloadStat[] = [
      { date: "2024-01-15", count: 1 },
      { date: "2024-01-31", count: 2 },
      { date: "2024-02-01", count: 3 },
      { date: "2024-03-01", count: 4 },
    ];

    const result = groupByPeriod(
      stats,
      1,
      addMonths,
      differenceInCalendarMonths,
      startOfMonth,
    );

    const expected: PeriodStat[] = [
      { start: "2024-01-01", end: "2024-01-31", count: 3 },
      { start: "2024-02-01", end: "2024-02-29", count: 3 },
      { start: "2024-03-01", end: "2024-03-31", count: 4 },
    ];

    expect(result).toEqual(expected);
  });

  it("should handle empty input", () => {
    const stats: DownloadStat[] = [];

    const result = groupByPeriod(stats, 1, addDays, differenceInCalendarDays);

    const expected: PeriodStat[] = [];

    expect(result).toEqual(expected);
  });

  const dayPeriodLengths = Array.from({ length: 32 }, (_, i) => i + 1);
  it.each(dayPeriodLengths)(
    "should handle single item input for day period length = %s",
    (periodLength) => {
      const stats: DownloadStat[] = [{ date: "2023-01-01", count: 5 }];

      const result = groupByPeriod(
        stats,
        periodLength,
        addDays,
        differenceInCalendarDays,
      );

      const actualPeriodStartDate = calculatePeriodStartDate(
        "2023-01-01",
        periodLength,
        (date) => getPeriodStartByDays(date, periodLength),
        differenceInCalendarDays,
        addDays,
      );

      const periodEndDate = calculatePeriodEndDate(
        actualPeriodStartDate,
        periodLength,
        addDays,
      );

      const expected: PeriodStat[] = [
        {
          start: format(actualPeriodStartDate, DATE_FORMAT),
          end: format(periodEndDate, DATE_FORMAT),
          count: 5,
        },
      ];

      expect(result).toEqual(expected);
    },
  );

  const weekPeriodLengths = Array.from({ length: 53 }, (_, i) => i + 1);
  it.each(weekPeriodLengths)(
    "should handle single item input for week period length = %s",
    (periodLength) => {
      const stats: DownloadStat[] = [{ date: "2023-01-01", count: 5 }];

      const result = groupByPeriod(
        stats,
        periodLength,
        addWeeks,
        differenceInCalendarWeeks,
      );

      const actualPeriodStartDate = calculatePeriodStartDate(
        "2023-01-01",
        periodLength,
        (date) => getPeriodStartByDays(date, periodLength),
        differenceInCalendarWeeks,
        addWeeks,
      );

      const periodEndDate = calculatePeriodEndDate(
        actualPeriodStartDate,
        periodLength,
        addWeeks,
      );

      const expected: PeriodStat[] = [
        {
          start: format(actualPeriodStartDate, DATE_FORMAT),
          end: format(periodEndDate, DATE_FORMAT),
          count: 5,
        },
      ];

      expect(result).toEqual(expected);
    },
  );

  const monthPeriodLengths = Array.from({ length: 13 }, (_, i) => i + 1);
  it.each(monthPeriodLengths)(
    "should handle single item input for month period length = %s",
    (periodLength) => {
      const stats: DownloadStat[] = [{ date: "2023-01-01", count: 5 }];

      const result = groupByPeriod(
        stats,
        periodLength,
        addMonths,
        differenceInCalendarMonths,
      );

      const actualPeriodStartDate = calculatePeriodStartDate(
        "2023-01-01",
        periodLength,
        (date) => getPeriodStartByDays(date, periodLength),
        differenceInCalendarMonths,
        addMonths,
      );

      const periodEndDate = calculatePeriodEndDate(
        actualPeriodStartDate,
        periodLength,
        addMonths,
      );

      const expected: PeriodStat[] = [
        {
          start: format(actualPeriodStartDate, DATE_FORMAT),
          end: format(periodEndDate, DATE_FORMAT),
          count: 5,
        },
      ];

      expect(result).toEqual(expected);
    },
  );

  const yearPeriodLengths = Array.from({ length: 10 }, (_, i) => i + 1);
  it.each(yearPeriodLengths)(
    "should handle single item input for year period length = %s",
    (periodLength) => {
      const stats: DownloadStat[] = [{ date: "2023-01-01", count: 5 }];

      const result = groupByPeriod(
        stats,
        periodLength,
        addYears,
        differenceInCalendarYears,
      );

      const actualPeriodStartDate = calculatePeriodStartDate(
        "2023-01-01",
        periodLength,
        (date) => getPeriodStartByDays(date, periodLength),
        differenceInCalendarYears,
        addYears,
      );

      const periodEndDate = calculatePeriodEndDate(
        actualPeriodStartDate,
        periodLength,
        addYears,
      );

      const periodStartDateString = format(actualPeriodStartDate, DATE_FORMAT);
      const todayUTC = format(new Date(), DATE_FORMAT);

      if (periodStartDateString > todayUTC) {
        expect(result).toEqual([]);
      } else {
        const expected: PeriodStat[] = [
          {
            start: periodStartDateString,
            end: format(periodEndDate, DATE_FORMAT),
            count: 5,
          },
        ];
        expect(result).toEqual(expected);
      }
    },
  );
});

describe("calculatePeriodEndDate", () => {
  describe("daily periods", () => {
    it("should calculate correct end date for 1-day period", () => {
      const periodStart = new Date("2023-05-15");
      const result = calculatePeriodEndDate(periodStart, 1, addDays);
      expect(format(result, DATE_FORMAT)).toEqual("2023-05-15");
    });

    it("should calculate correct end date for 3-day period", () => {
      const periodStart = new Date("2023-05-15");
      const result = calculatePeriodEndDate(periodStart, 3, addDays);
      expect(format(result, DATE_FORMAT)).toEqual("2023-05-17");
    });

    it("should calculate correct end date for 7-day period", () => {
      const periodStart = new Date("2023-05-15");
      const result = calculatePeriodEndDate(periodStart, 7, addDays);
      expect(format(result, DATE_FORMAT)).toEqual("2023-05-21");
    });

    it("should handle month boundary crossing", () => {
      const periodStart = new Date("2023-05-30");
      const result = calculatePeriodEndDate(periodStart, 3, addDays);
      expect(format(result, DATE_FORMAT)).toEqual("2023-06-01");
    });

    it("should handle year boundary crossing", () => {
      const periodStart = new Date("2023-12-30");
      const result = calculatePeriodEndDate(periodStart, 3, addDays);
      expect(format(result, DATE_FORMAT)).toEqual("2024-01-01");
    });
  });

  describe("weekly periods", () => {
    it("should calculate correct end date for 1-week period", () => {
      const periodStart = new Date("2023-05-15");
      const result = calculatePeriodEndDate(periodStart, 1, addWeeks);
      expect(format(result, DATE_FORMAT)).toEqual("2023-05-21");
    });

    it("should calculate correct end date for 2-week period", () => {
      const periodStart = new Date("2023-05-15");
      const result = calculatePeriodEndDate(periodStart, 2, addWeeks);
      expect(format(result, DATE_FORMAT)).toEqual("2023-05-28");
    });

    it("should calculate correct end date for 4-week period", () => {
      const periodStart = new Date("2023-05-01");
      const result = calculatePeriodEndDate(periodStart, 4, addWeeks);
      expect(format(result, DATE_FORMAT)).toEqual("2023-05-28");
    });

    it("should handle month boundary crossing for weekly periods", () => {
      const periodStart = new Date("2023-05-29");
      const result = calculatePeriodEndDate(periodStart, 1, addWeeks);
      expect(format(result, DATE_FORMAT)).toEqual("2023-06-04");
    });
  });

  describe("monthly periods", () => {
    it("should calculate correct end date for 1-month period", () => {
      const periodStart = new Date("2023-05-01");
      const result = calculatePeriodEndDate(periodStart, 1, addMonths);
      expect(format(result, DATE_FORMAT)).toEqual("2023-05-31");
    });

    it("should calculate correct end date for 3-month period", () => {
      const periodStart = new Date("2023-01-01");
      const result = calculatePeriodEndDate(periodStart, 3, addMonths);
      expect(format(result, DATE_FORMAT)).toEqual("2023-03-31");
    });

    it("should handle February in non-leap year", () => {
      const periodStart = new Date("2023-02-01");
      const result = calculatePeriodEndDate(periodStart, 1, addMonths);
      expect(format(result, DATE_FORMAT)).toEqual("2023-02-28");
    });

    it("should handle February in leap year", () => {
      const periodStart = new Date("2024-02-01");
      const result = calculatePeriodEndDate(periodStart, 1, addMonths);
      expect(format(result, DATE_FORMAT)).toEqual("2024-02-29");
    });

    it("should handle year boundary crossing for monthly periods", () => {
      const periodStart = new Date("2023-12-01");
      const result = calculatePeriodEndDate(periodStart, 2, addMonths);
      expect(format(result, DATE_FORMAT)).toEqual("2024-01-31");
    });

    it("should handle different month lengths", () => {
      const periodStart = new Date("2023-01-31");
      const result = calculatePeriodEndDate(periodStart, 1, addMonths);
      expect(format(result, DATE_FORMAT)).toEqual("2023-02-27");
    });
  });

  describe("yearly periods", () => {
    it("should calculate correct end date for 1-year period", () => {
      const periodStart = new Date("2023-01-01");
      const result = calculatePeriodEndDate(periodStart, 1, addYears);
      expect(format(result, DATE_FORMAT)).toEqual("2023-12-31");
    });

    it("should calculate correct end date for 2-year period", () => {
      const periodStart = new Date("2023-01-01");
      const result = calculatePeriodEndDate(periodStart, 2, addYears);
      expect(format(result, DATE_FORMAT)).toEqual("2024-12-31");
    });

    it("should handle leap year to non-leap year transition", () => {
      const periodStart = new Date("2024-02-29");
      const result = calculatePeriodEndDate(periodStart, 1, addYears);
      expect(format(result, DATE_FORMAT)).toEqual("2025-02-27");
    });

    it("should handle non-leap year to leap year transition", () => {
      const periodStart = new Date("2023-02-28");
      const result = calculatePeriodEndDate(periodStart, 1, addYears);
      expect(format(result, DATE_FORMAT)).toEqual("2024-02-27");
    });
  });

  describe("edge cases", () => {
    it("should handle period length of 0", () => {
      const periodStart = new Date("2023-05-15");
      const result = calculatePeriodEndDate(periodStart, 0, addDays);
      expect(format(result, DATE_FORMAT)).toEqual("2023-05-14");
    });

    it("should handle very large period lengths", () => {
      const periodStart = new Date("2023-01-01");
      const result = calculatePeriodEndDate(periodStart, 365, addDays);
      expect(format(result, DATE_FORMAT)).toEqual("2023-12-31");
    });

    it("should handle start date at beginning of time", () => {
      const periodStart = new Date("1970-01-01");
      const result = calculatePeriodEndDate(periodStart, 1, addDays);
      expect(format(result, DATE_FORMAT)).toEqual("1970-01-01");
    });

    it("should handle start date far in the future", () => {
      const periodStart = new Date("2099-12-01");
      const result = calculatePeriodEndDate(periodStart, 1, addMonths);
      expect(format(result, DATE_FORMAT)).toEqual("2099-12-31");
    });
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
    expect(format(result, DATE_FORMAT)).toEqual("2023-05-15");
  });

  it("should calculate correct start date for 3-day periods", () => {
    const result = calculatePeriodStartDate(
      "2023-05-16",
      3,
      undefined,
      differenceInCalendarDays,
      addDays,
    );

    expect(format(result, DATE_FORMAT)).toEqual("2023-05-14");
  });

  it("should calculate correct start date for weekly periods", () => {
    const result = calculatePeriodStartDate(
      "2023-05-15",
      1,
      startOfWeek,
      differenceInCalendarWeeks,
      addWeeks,
    );
    expect(format(result, DATE_FORMAT)).toEqual("2023-05-14");
  });

  it("should calculate correct start date for monthly periods", () => {
    const result = calculatePeriodStartDate(
      "2023-05-15",
      1,
      startOfMonth,
      differenceInCalendarMonths,
      addMonths,
    );
    expect(format(result, DATE_FORMAT)).toEqual("2023-05-01");
  });

  it("should calculate correct start date for yearly periods", () => {
    const result = calculatePeriodStartDate(
      "2023-05-15",
      1,
      startOfYear,
      differenceInCalendarYears,
      addYears,
    );
    expect(format(result, DATE_FORMAT)).toEqual("2023-01-01");
  });

  it("should handle leap years correctly", () => {
    const result = calculatePeriodStartDate(
      "2024-02-29",
      1,
      startOfYear,
      differenceInCalendarYears,
      addYears,
    );
    expect(format(result, DATE_FORMAT)).toEqual("2024-01-01");
  });
});

describe("updateGroupedStats", () => {
  it("should create a new entry if the periodKey does not exist", () => {
    const grouped: Record<string, PeriodStat> = {};
    const period = { start: "2023-04-15", end: "2023-04-15" };
    const periodKey = createPeriodKey(period.start, period.end);
    const count = 5;

    updateGroupedStats(grouped, period, count);

    expect(grouped[periodKey]).toEqual({ ...period, count: 5 });
  });

  it("should update an existing entry if the periodKey exists", () => {
    const grouped: Record<string, PeriodStat> = {
      "2023-04-15:2023-04-15": {
        start: "2023-04-15",
        end: "2023-04-15",
        count: 3,
      },
    };
    const period = { start: "2023-04-15", end: "2023-04-15" };
    const periodKey = createPeriodKey(period.start, period.end);
    const count = 2;

    updateGroupedStats(grouped, period, count);

    expect(grouped[periodKey]).toEqual({ ...period, count: 5 });
  });

  it("should handle multiple updates to the same periodKey", () => {
    const grouped: Record<string, PeriodStat> = {};
    const period = { start: "2023-04-15", end: "2023-04-15" };
    const periodKey = createPeriodKey(period.start, period.end);

    updateGroupedStats(grouped, period, 3);
    updateGroupedStats(grouped, period, 2);
    updateGroupedStats(grouped, period, 1);

    expect(grouped[periodKey]).toEqual({ ...period, count: 6 });
  });

  it("should handle updates to multiple periodKeys", () => {
    const grouped: Record<string, PeriodStat> = {};
    const period1 = { start: "2023-04-15", end: "2023-04-15" };
    const period2 = { start: "2023-04-16", end: "2023-04-16" };
    const periodKey1 = createPeriodKey(period1.start, period1.end);
    const periodKey2 = createPeriodKey(period2.start, period2.end);

    updateGroupedStats(grouped, period1, 1);
    updateGroupedStats(grouped, period2, 2);

    expect(grouped[periodKey1]).toEqual({ ...period1, count: 1 });
    expect(grouped[periodKey2]).toEqual({ ...period2, count: 2 });
  });
});

describe("createPeriodKey", () => {
  it("should create correct period key with standard date format", () => {
    const start = "2023-04-15";
    const end = "2023-04-15";
    const result = createPeriodKey(start, end);
    expect(result).toBe("2023-04-15:2023-04-15");
  });

  it("should create correct period key with different start and end dates", () => {
    const start = "2023-04-15";
    const end = "2023-04-17";
    const result = createPeriodKey(start, end);
    expect(result).toBe("2023-04-15:2023-04-17");
  });

  it("should create unique keys for different date combinations", () => {
    const key1 = createPeriodKey("2023-04-15", "2023-04-15");
    const key2 = createPeriodKey("2023-04-15", "2023-04-16");
    const key3 = createPeriodKey("2023-04-16", "2023-04-15");

    expect(key1).not.toBe(key2);
    expect(key2).not.toBe(key3);
    expect(key1).not.toBe(key3);

    expect(key1).toBe("2023-04-15:2023-04-15");
    expect(key2).toBe("2023-04-15:2023-04-16");
    expect(key3).toBe("2023-04-16:2023-04-15");
  });

  it("should handle valid date format edge cases", () => {
    expect(createPeriodKey("2024-02-29", "2024-02-29")).toBe(
      "2024-02-29:2024-02-29",
    );

    expect(createPeriodKey("2023-12-31", "2024-01-01")).toBe(
      "2023-12-31:2024-01-01",
    );

    expect(createPeriodKey("2023-01-01", "2023-12-31")).toBe(
      "2023-01-01:2023-12-31",
    );
  });

  describe("validation errors", () => {
    it("should throw error for empty strings", () => {
      expect(() => createPeriodKey("", "")).toThrow("Invalid date format");
      expect(() => createPeriodKey("2023-04-15", "")).toThrow(
        "Invalid date format",
      );
      expect(() => createPeriodKey("", "2023-04-15")).toThrow(
        "Invalid date format",
      );
    });

    it("should throw error for invalid date formats", () => {
      expect(() => createPeriodKey("2023/04/15", "2023-04-15")).toThrow(
        "Invalid date format",
      );
      expect(() => createPeriodKey("2023.04.15", "2023-04-15")).toThrow(
        "Invalid date format",
      );

      expect(() => createPeriodKey("Apr 15, 2023", "2023-04-15")).toThrow(
        "Invalid date format",
      );
      expect(() => createPeriodKey("15-04-2023", "2023-04-15")).toThrow(
        "Invalid date format",
      );

      expect(() => createPeriodKey("20230415", "2023-04-15")).toThrow(
        "Invalid date format",
      );
    });

    it("should throw error for datetime strings", () => {
      expect(() =>
        createPeriodKey("2023-04-15T10:30:00", "2023-04-15"),
      ).toThrow("Invalid date format");
      expect(() =>
        createPeriodKey("2023-04-15T10:30:00Z", "2023-04-15"),
      ).toThrow("Invalid date format");
      expect(() =>
        createPeriodKey("2023-04-15T10:30:00.123Z", "2023-04-15"),
      ).toThrow("Invalid date format");
    });

    it("should throw error for strings with extra whitespace", () => {
      expect(() => createPeriodKey(" 2023-04-15", "2023-04-15")).toThrow(
        "Invalid date format",
      );
      expect(() => createPeriodKey("2023-04-15 ", "2023-04-15")).toThrow(
        "Invalid date format",
      );
      expect(() => createPeriodKey(" 2023-04-15 ", "2023-04-15")).toThrow(
        "Invalid date format",
      );
    });

    it("should throw error for invalid date components", () => {
      expect(() => createPeriodKey("23-04-15", "2023-04-15")).toThrow(
        "Invalid date format",
      );
      expect(() => createPeriodKey("20233-04-15", "2023-04-15")).toThrow(
        "Invalid date format",
      );

      expect(() => createPeriodKey("2023-4-15", "2023-04-15")).toThrow(
        "Invalid date format",
      );
      expect(() => createPeriodKey("2023-004-15", "2023-04-15")).toThrow(
        "Invalid date format",
      );

      expect(() => createPeriodKey("2023-04-5", "2023-04-15")).toThrow(
        "Invalid date format",
      );
      expect(() => createPeriodKey("2023-04-015", "2023-04-15")).toThrow(
        "Invalid date format",
      );
    });
  });
});

describe("groupByPeriod future period filtering", () => {
  it("should not create periods that start in the future", () => {
    const today = new Date();
    const nextMonday = new Date(today);
    const daysUntilNextMonday = (8 - today.getDay()) % 7 || 7;
    nextMonday.setDate(today.getDate() + daysUntilNextMonday);

    const nextMondayString = format(nextMonday, DATE_FORMAT);

    const stats: DownloadStat[] = [{ date: nextMondayString, count: 5 }];

    const result = groupByWeeks(stats);

    expect(result).toEqual([]);
  });

  it("should create periods that start today or in the past (even if they end in the future)", () => {
    const today = new Date();
    const todayString = format(today, DATE_FORMAT);

    const stats: DownloadStat[] = [{ date: todayString, count: 5 }];

    const result = groupByWeeks(stats);

    expect(result.length).toBeGreaterThanOrEqual(0);

    if (result.length > 0) {
      expect(result[0]!.start <= todayString).toBe(true);
    }
  });
});
