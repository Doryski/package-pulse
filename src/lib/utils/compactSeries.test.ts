import { describe, expect, test } from "vitest";
import { expandCompactSeries, toCompactSeries } from "./compactSeries";

describe("toCompactSeries", () => {
  test("encodes consecutive days as a start date and counts", () => {
    expect(
      toCompactSeries([
        { date: "2024-01-01", count: 1 },
        { date: "2024-01-02", count: 2 },
        { date: "2024-01-03", count: 3 },
      ]),
    ).toEqual({ start: "2024-01-01", counts: [1, 2, 3] });
  });

  test("marks missing days as null gaps", () => {
    expect(
      toCompactSeries([
        { date: "2024-02-27", count: 5 },
        { date: "2024-03-02", count: 9 },
      ]),
    ).toEqual({ start: "2024-02-27", counts: [5, null, null, null, 9] });
  });

  test("accepts unsorted input", () => {
    expect(
      toCompactSeries([
        { date: "2024-01-03", count: 3 },
        { date: "2024-01-01", count: 1 },
      ]),
    ).toEqual({ start: "2024-01-01", counts: [1, null, 3] });
  });

  test("spans a DST change without drifting", () => {
    expect(
      toCompactSeries([
        { date: "2024-03-30", count: 1 },
        { date: "2024-04-01", count: 2 },
      ]),
    ).toEqual({ start: "2024-03-30", counts: [1, null, 2] });
  });

  test("returns an empty series for no data", () => {
    expect(toCompactSeries([])).toEqual({ start: "", counts: [] });
  });
});

describe("expandCompactSeries", () => {
  test("restores one entry per day from the start date", () => {
    expect(
      expandCompactSeries({ start: "2023-12-30", counts: [4, 0, 6] }),
    ).toEqual([
      { date: "2023-12-30", count: 4 },
      { date: "2023-12-31", count: 0 },
      { date: "2024-01-01", count: 6 },
    ]);
  });

  test("returns an empty list for an empty series", () => {
    expect(expandCompactSeries({ start: "", counts: [] })).toEqual([]);
  });

  test("round-trips a gap-free series", () => {
    const series = [
      { date: "2024-02-28", count: 10 },
      { date: "2024-02-29", count: 20 },
      { date: "2024-03-01", count: 30 },
    ];

    expect(expandCompactSeries(toCompactSeries(series))).toEqual(series);
  });
});

describe("expandCompactSeries gaps", () => {
  test("skips null gaps and keeps real zero days", () => {
    expect(
      expandCompactSeries({ start: "2024-01-01", counts: [3, null, 0, 4] }),
    ).toEqual([
      { date: "2024-01-01", count: 3 },
      { date: "2024-01-03", count: 0 },
      { date: "2024-01-04", count: 4 },
    ]);
  });
});
