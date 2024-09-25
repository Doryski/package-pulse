import { describe, expect, it } from "vitest";
import getTimePeriods from "./getTimePeriods";

describe("getTimePeriods", () => {
  it("should return correct periods for days", () => {
    const from = new Date("2023-01-01");
    const to = new Date("2023-01-05");
    const periods = getTimePeriods(from, to, 1, "days");

    expect(periods).toHaveLength(4);
    expect(periods).toEqual([
      {
        start: new Date("2023-01-04"),
        end: new Date("2023-01-05"),
      },
      {
        start: new Date("2023-01-03"),
        end: new Date("2023-01-04"),
      },
      {
        start: new Date("2023-01-02"),
        end: new Date("2023-01-03"),
      },
      {
        start: new Date("2023-01-01"),
        end: new Date("2023-01-02"),
      },
    ]);
  });

  it("should return correct periods for hours", () => {
    const from = new Date("2023-01-01T00:00:00");
    const to = new Date("2023-01-01T12:00:00");
    const periods = getTimePeriods(from, to, 3, "hours");

    expect(periods).toHaveLength(4);
    expect(periods).toEqual([
      {
        start: new Date("2023-01-01T09:00:00"),
        end: new Date("2023-01-01T12:00:00"),
      },
      {
        start: new Date("2023-01-01T06:00:00"),
        end: new Date("2023-01-01T09:00:00"),
      },
      {
        start: new Date("2023-01-01T03:00:00"),
        end: new Date("2023-01-01T06:00:00"),
      },
      {
        start: new Date("2023-01-01T00:00:00"),
        end: new Date("2023-01-01T03:00:00"),
      },
    ]);
  });

  it("should handle periods that don't divide evenly", () => {
    const from = new Date("2023-01-01");
    const to = new Date("2023-01-11");
    const periods = getTimePeriods(from, to, 3, "days");

    expect(periods).toEqual([
      {
        start: new Date("2023-01-08"),
        end: new Date("2023-01-11"),
      },
      {
        start: new Date("2023-01-05"),
        end: new Date("2023-01-08"),
      },
      {
        start: new Date("2023-01-02"),
        end: new Date("2023-01-05"),
      },
      {
        start: new Date("2023-01-01"),
        end: new Date("2023-01-02"),
      },
    ]);
  });

  it("should handle when from and to are the same", () => {
    const date = new Date("2023-01-01");
    const periods = getTimePeriods(date, date, 1, "days");

    expect(periods).toHaveLength(0);
  });

  it("should handle when from is after to", () => {
    const from = new Date("2023-01-02");
    const to = new Date("2023-01-01");
    const periods = getTimePeriods(from, to, 1, "days");

    expect(periods).toHaveLength(0);
  });

  it("should work with months", () => {
    const from = new Date("2023-03-01T00:00:00.000Z");
    const to = new Date("2023-08-01T00:00:00.000Z");
    const periods = getTimePeriods(from, to, 2, "months");

    expect(periods).toHaveLength(3);
    expect(periods).toEqual([
      {
        start: new Date("2023-06-01T00:00:00.000Z"),
        end: new Date("2023-08-01T00:00:00.000Z"),
      },
      {
        start: new Date("2023-04-01T00:00:00.000Z"),
        end: new Date("2023-06-01T00:00:00.000Z"),
      },
      {
        start: new Date("2023-03-01T00:00:00.000Z"),
        end: new Date("2023-04-01T00:00:00.000Z"),
      },
    ]);
  });

  it("should work with years", () => {
    const from = new Date("2021-01-01T00:00:00.000Z");
    const to = new Date("2024-01-01T00:00:00.000Z");
    const periods = getTimePeriods(from, to, 2, "years");

    expect(periods).toHaveLength(2);
    expect(periods).toEqual([
      {
        start: new Date("2022-01-01T00:00:00.000Z"),
        end: new Date("2024-01-01T00:00:00.000Z"),
      },
      {
        start: new Date("2021-01-01T00:00:00.000Z"),
        end: new Date("2022-01-01T00:00:00.000Z"),
      },
    ]);
  });
});
