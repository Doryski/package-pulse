import { describe, expect, test } from "vitest";
import trimTrailingZeroDays from "./trimTrailingZeroDays";

const day = (date: string, count: number) => ({ date, count });

describe("trimTrailingZeroDays", () => {
  test.each([
    { name: "empty series", input: [], expected: [] },
    {
      name: "no trailing zeros",
      input: [day("2026-10-01", 5), day("2026-10-02", 7)],
      expected: [day("2026-10-01", 5), day("2026-10-02", 7)],
    },
    {
      name: "trailing zeros from npm lag",
      input: [day("2026-10-12", 9), day("2026-10-13", 0), day("2026-10-14", 0)],
      expected: [day("2026-10-12", 9)],
    },
    {
      name: "inner zero gap is kept",
      input: [day("2026-10-05", 3), day("2026-10-06", 0), day("2026-10-07", 4)],
      expected: [
        day("2026-10-05", 3),
        day("2026-10-06", 0),
        day("2026-10-07", 4),
      ],
    },
    {
      name: "all zeros are kept",
      input: [day("2026-10-01", 0), day("2026-10-02", 0)],
      expected: [day("2026-10-01", 0), day("2026-10-02", 0)],
    },
    {
      name: "single non-zero day",
      input: [day("2026-10-01", 1)],
      expected: [day("2026-10-01", 1)],
    },
  ])("$name", ({ input, expected }) => {
    expect(trimTrailingZeroDays(input)).toEqual(expected);
  });
});
