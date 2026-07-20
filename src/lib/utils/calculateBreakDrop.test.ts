import { describe, expect, test, vi } from "vitest";
import {
  calculateBreakDrop,
  getLast5ChristmasYears,
} from "./calculateBreakDrop";
import { DownloadStat } from "./groupByPeriod";

const WEEKDAY_COUNT = 10000;

const pad = (value: number) => String(value).padStart(2, "0");

const toISODate = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const makeSeries = (
  start: Date,
  end: Date,
  countFn: (date: Date) => number,
): DownloadStat[] => {
  const series: DownloadStat[] = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    series.push({ date: toISODate(cursor), count: countFn(new Date(cursor)) });
    cursor.setDate(cursor.getDate() + 1);
  }
  return series;
};

const corporateCountFn = (weekendChristmasCount: number) => (date: Date) => {
  const isChristmasDip =
    date.getMonth() === 11 && date.getDate() >= 22 && date.getDate() <= 28;
  const dayOfWeek = date.getDay();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  return isChristmasDip || isWeekend ? weekendChristmasCount : WEEKDAY_COUNT;
};

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

describe("calculateBreakDrop", () => {
  describe("insufficient data threshold boundary", () => {
    test("should report not enough data when there are fewer than 365 days", () => {
      const rawData = makeSeries(
        new Date(2024, 0, 1),
        new Date(2024, 3, 9),
        () => WEEKDAY_COUNT,
      );
      expect(rawData.length).toBeLessThan(365);

      expect(calculateBreakDrop(rawData)).toEqual({
        christmasDropPercentage: 0,
        weekendDropPercentage: 0,
        corporateUsageScore: 0,
        corporateUsageLevel: "very_low",
        hasEnoughData: false,
      });
    });

    test("should report not enough data when the 365-day average is just below the threshold", () => {
      const rawData = makeSeries(
        new Date(2024, 0, 1),
        new Date(2024, 11, 30),
        () => 4999,
      );
      expect(rawData).toHaveLength(365);

      expect(calculateBreakDrop(rawData)).toEqual({
        christmasDropPercentage: 0,
        weekendDropPercentage: 0,
        corporateUsageScore: 0,
        corporateUsageLevel: "very_low",
        hasEnoughData: false,
      });
    });

    test("should pass the threshold when the 365-day average is exactly the threshold", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2024, 11, 25));

      const rawData = makeSeries(
        new Date(2024, 0, 1),
        new Date(2024, 11, 30),
        () => 5000,
      );
      expect(rawData).toHaveLength(365);

      const result = calculateBreakDrop(rawData);

      expect(result.hasEnoughData).toBe(true);
      expect(result.weekendDropPercentage).toBe(0);
      expect(result.christmasDropPercentage).toBeNull();
      expect(result.corporateUsageScore).toBe(0);
      expect(result.corporateUsageLevel).toBe("very_low");

      vi.useRealTimers();
    });
  });

  describe("null christmas signal with a valid weekend signal", () => {
    test("should derive the score from the weekend signal when the last 5 christmas years exist but are all below the threshold", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2025, 11, 1));

      const insufficientChristmasYears = makeSeries(
        new Date(2020, 0, 1),
        new Date(2024, 11, 31),
        () => 1000,
      );
      const recentValidYear = makeSeries(
        new Date(2025, 0, 1),
        new Date(2025, 11, 31),
        corporateCountFn(3000),
      );
      const rawData = [...insufficientChristmasYears, ...recentValidYear];

      const result = calculateBreakDrop(rawData);

      expect(result.hasEnoughData).toBe(true);
      expect(result.christmasDropPercentage).toBeNull();
      expect(result.weekendDropPercentage).toBeCloseTo(70, 5);
      expect(result.corporateUsageScore).toBeCloseTo(70, 5);
      expect(result.corporateUsageLevel).toBe("high");

      vi.useRealTimers();
    });

    test("should derive the score from the weekend signal when the last 5 christmas years have no data at all", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2023, 5, 1));

      const rawData = makeSeries(
        new Date(2017, 0, 1),
        new Date(2017, 11, 31),
        corporateCountFn(4000),
      );
      expect(rawData).toHaveLength(365);

      const result = calculateBreakDrop(rawData);

      expect(result.hasEnoughData).toBe(true);
      expect(result.christmasDropPercentage).toBeNull();
      expect(result.weekendDropPercentage).toBeCloseTo(60, 5);
      expect(result.corporateUsageScore).toBeCloseTo(60, 5);
      expect(result.corporateUsageLevel).toBe("moderate");

      vi.useRealTimers();
    });
  });

  describe("corporate usage level boundaries", () => {
    const cases = [
      { weekendChristmasCount: 2000, score: 80, level: "very_high" },
      { weekendChristmasCount: 2100, score: 79, level: "high" },
      { weekendChristmasCount: 3000, score: 70, level: "high" },
      { weekendChristmasCount: 3100, score: 69, level: "moderate" },
      { weekendChristmasCount: 4000, score: 60, level: "moderate" },
      { weekendChristmasCount: 4100, score: 59, level: "low" },
      { weekendChristmasCount: 5000, score: 50, level: "low" },
      { weekendChristmasCount: 5100, score: 49, level: "very_low" },
    ] as const;

    test.each(cases)(
      "should map a score of $score to the $level level",
      ({ weekendChristmasCount, score, level }) => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date(2024, 11, 25));

        const rawData = makeSeries(
          new Date(2020, 0, 1),
          new Date(2025, 1, 28),
          corporateCountFn(weekendChristmasCount),
        );

        const result = calculateBreakDrop(rawData);

        expect(result.hasEnoughData).toBe(true);
        expect(result.christmasDropPercentage).toBeCloseTo(score, 5);
        expect(result.weekendDropPercentage).toBeCloseTo(score, 5);
        expect(result.corporateUsageScore).toBeCloseTo(score, 5);
        expect(result.corporateUsageLevel).toBe(level);

        vi.useRealTimers();
      },
    );
  });
});
