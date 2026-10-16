import { describe, expect, test } from "vitest";
import { formatDate, parseDate, startOfWeek } from "./date-utils";

describe("date-utils", () => {
  test("parseDate parses an ISO date string", () => {
    const date = parseDate("2024-03-15");
    expect([date.getFullYear(), date.getMonth(), date.getDate()]).toEqual([
      2024, 2, 15,
    ]);
  });

  test("formatDate formats as yyyy-MM-dd", () => {
    expect(formatDate(new Date(2024, 0, 5))).toBe("2024-01-05");
  });

  test("startOfWeek returns the Monday of the week", () => {
    expect(formatDate(startOfWeek(parseDate("2024-03-17")))).toBe("2024-03-11");
    expect(formatDate(startOfWeek(parseDate("2024-03-11")))).toBe("2024-03-11");
  });
});
