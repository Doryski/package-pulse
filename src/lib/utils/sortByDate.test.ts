import { describe, expect, it } from "vitest";
import sortByDate from "./sortByDate";

describe("sortByDate", () => {
  it("should sort an array of objects by date in ascending order", () => {
    const input = [
      { date: "2023-03-15", value: "C" },
      { date: "2023-01-01", value: "A" },
      { date: "2023-06-30", value: "D" },
      { date: "2023-02-14", value: "B" },
    ];

    const expected = [
      { date: "2023-01-01", value: "A" },
      { date: "2023-02-14", value: "B" },
      { date: "2023-03-15", value: "C" },
      { date: "2023-06-30", value: "D" },
    ];

    const result = sortByDate(input, (item) => new Date(item.date));
    expect(result).toEqual(expected);
  });

  it("should handle an empty array", () => {
    const input: { date: string }[] = [];
    const result = sortByDate(input, (item) => new Date(item.date));
    expect(result).toEqual([]);
  });

  it("should handle an array with a single item", () => {
    const input = [{ date: "2023-01-01", value: "A" }];
    const result = sortByDate(input, (item) => new Date(item.date));
    expect(result).toEqual(input);
  });

  it("should handle dates in different formats", () => {
    const input = [
      { date: "2023-03-15T12:00:00Z", value: "C" },
      { date: "2023-01-01", value: "A" },
      { date: "2023-06-30 15:30:00", value: "D" },
      { date: "2023-02-14T09:45:30.123Z", value: "B" },
    ];

    const expected = [
      { date: "2023-01-01", value: "A" },
      { date: "2023-02-14T09:45:30.123Z", value: "B" },
      { date: "2023-03-15T12:00:00Z", value: "C" },
      { date: "2023-06-30 15:30:00", value: "D" },
    ];

    const result = sortByDate(input, (item) => new Date(item.date));
    expect(result).toEqual(expected);
  });

  it("should sort by a custom date field", () => {
    const input = [
      { customDate: "2023-03-15", value: "C" },
      { customDate: "2023-01-01", value: "A" },
      { customDate: "2023-06-30", value: "D" },
      { customDate: "2023-02-14", value: "B" },
    ];

    const expected = [
      { customDate: "2023-01-01", value: "A" },
      { customDate: "2023-02-14", value: "B" },
      { customDate: "2023-03-15", value: "C" },
      { customDate: "2023-06-30", value: "D" },
    ];

    const result = sortByDate(input, (item) => new Date(item.customDate));
    expect(result).toEqual(expected);
  });
});
