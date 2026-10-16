import { describe, expect, it } from "vitest";
import getTimePeriods from "./getTimePeriods";

describe("getTimePeriods", () => {
  it("should return forward periods for days", () => {
    const from = new Date("2023-01-01");
    const to = new Date("2023-01-05");
    const periods = getTimePeriods(from, to, 1, "days");

    expect(periods).toEqual([
      { start: new Date("2023-01-01"), end: new Date("2023-01-02") },
      { start: new Date("2023-01-02"), end: new Date("2023-01-03") },
      { start: new Date("2023-01-03"), end: new Date("2023-01-04") },
      { start: new Date("2023-01-04"), end: new Date("2023-01-05") },
    ]);
  });

  it("should return correct periods for hours", () => {
    const from = new Date("2023-01-01T00:00:00");
    const to = new Date("2023-01-01T12:00:00");
    const periods = getTimePeriods(from, to, 3, "hours");

    expect(periods).toEqual([
      {
        start: new Date("2023-01-01T00:00:00"),
        end: new Date("2023-01-01T03:00:00"),
      },
      {
        start: new Date("2023-01-01T03:00:00"),
        end: new Date("2023-01-01T06:00:00"),
      },
      {
        start: new Date("2023-01-01T06:00:00"),
        end: new Date("2023-01-01T09:00:00"),
      },
      {
        start: new Date("2023-01-01T09:00:00"),
        end: new Date("2023-01-01T12:00:00"),
      },
    ]);
  });

  it("should clip the last period to the end date", () => {
    const from = new Date("2023-01-01");
    const to = new Date("2023-01-11");
    const periods = getTimePeriods(from, to, 3, "days");

    expect(periods).toEqual([
      { start: new Date("2023-01-01"), end: new Date("2023-01-04") },
      { start: new Date("2023-01-04"), end: new Date("2023-01-07") },
      { start: new Date("2023-01-07"), end: new Date("2023-01-10") },
      { start: new Date("2023-01-10"), end: new Date("2023-01-11") },
    ]);
  });

  it("should handle when from and to are the same", () => {
    const date = new Date("2023-01-01");

    expect(getTimePeriods(date, date, 1, "days")).toHaveLength(0);
  });

  it("should handle when from is after to", () => {
    const from = new Date("2023-01-02");
    const to = new Date("2023-01-01");

    expect(getTimePeriods(from, to, 1, "days")).toHaveLength(0);
  });

  it("should return no periods for a non-positive unit count", () => {
    const from = new Date("2023-01-01");
    const to = new Date("2023-01-05");

    expect(getTimePeriods(from, to, 0, "days")).toEqual([]);
  });

  it("should work with months", () => {
    const from = new Date("2023-03-01T00:00:00");
    const to = new Date("2023-08-01T00:00:00");
    const periods = getTimePeriods(from, to, 2, "months");

    expect(periods).toEqual([
      {
        start: new Date("2023-03-01T00:00:00"),
        end: new Date("2023-05-01T00:00:00"),
      },
      {
        start: new Date("2023-05-01T00:00:00"),
        end: new Date("2023-07-01T00:00:00"),
      },
      {
        start: new Date("2023-07-01T00:00:00"),
        end: new Date("2023-08-01T00:00:00"),
      },
    ]);
  });

  it("should work with years", () => {
    const from = new Date("2021-01-01T00:00:00.000Z");
    const to = new Date("2024-01-01T00:00:00.000Z");
    const periods = getTimePeriods(from, to, 2, "years");

    expect(periods).toEqual([
      {
        start: new Date("2021-01-01T00:00:00.000Z"),
        end: new Date("2023-01-01T00:00:00.000Z"),
      },
      {
        start: new Date("2023-01-01T00:00:00.000Z"),
        end: new Date("2024-01-01T00:00:00.000Z"),
      },
    ]);
  });

  describe("with an anchor", () => {
    const anchor = new Date("2023-01-01");

    it("aligns windows to the anchor and keeps only those intersecting the range", () => {
      const from = new Date("2023-01-15");
      const to = new Date("2023-02-05");
      const periods = getTimePeriods(from, to, 10, "days", anchor);

      expect(periods).toEqual([
        { start: new Date("2023-01-11"), end: new Date("2023-01-21") },
        { start: new Date("2023-01-21"), end: new Date("2023-01-31") },
        { start: new Date("2023-01-31"), end: new Date("2023-02-05") },
      ]);
    });

    it("skips a window that only touches the start date", () => {
      const from = new Date("2023-01-11");
      const to = new Date("2023-01-15");
      const periods = getTimePeriods(from, to, 10, "days", anchor);

      expect(periods).toEqual([
        { start: new Date("2023-01-11"), end: new Date("2023-01-15") },
      ]);
    });

    it("keeps every boundary but the last identical for two different end dates", () => {
      const from = new Date("2023-01-01");
      const today = getTimePeriods(
        from,
        new Date("2023-03-15"),
        10,
        "days",
        anchor,
      );
      const tomorrow = getTimePeriods(
        from,
        new Date("2023-03-16"),
        10,
        "days",
        anchor,
      );

      expect(tomorrow.slice(0, -1)).toEqual(today.slice(0, -1));
      expect(today.at(-1)).toEqual({
        start: new Date("2023-03-12"),
        end: new Date("2023-03-15"),
      });
      expect(tomorrow.at(-1)).toEqual({
        start: new Date("2023-03-12"),
        end: new Date("2023-03-16"),
      });
    });
  });
});
