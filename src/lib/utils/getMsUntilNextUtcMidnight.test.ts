import { describe, expect, test } from "vitest";
import getMsUntilNextUtcMidnight from "./getMsUntilNextUtcMidnight";

describe("getMsUntilNextUtcMidnight", () => {
  test.each([
    ["2024-03-05T23:30:00Z", 30 * 60 * 1000],
    ["2024-03-05T00:00:00Z", 24 * 60 * 60 * 1000],
    ["2024-03-05T12:00:00.250Z", 12 * 60 * 60 * 1000 - 250],
  ])("from %s", (iso, expected) => {
    expect(getMsUntilNextUtcMidnight(Date.parse(iso))).toBe(expected);
  });

  test("lands exactly on the next UTC midnight", () => {
    const timestamp = Date.parse("2024-12-31T18:45:12Z");

    expect(
      new Date(timestamp + getMsUntilNextUtcMidnight(timestamp)).toISOString(),
    ).toBe("2025-01-01T00:00:00.000Z");
  });
});
