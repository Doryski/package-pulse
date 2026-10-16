import { describe, expect, test } from "vitest";
import trimToDataHorizon from "./trimToDataHorizon";

const day = (date: string, count: number) => ({ date, count });
const EARLIEST = "2026-10-09";

describe("trimToDataHorizon", () => {
  test("trims npm lag zeros so every series ends on the shared horizon", () => {
    const result = trimToDataHorizon(
      {
        react: [day("2026-10-12", 9), day("2026-10-13", 0)],
        vue: [day("2026-10-11", 4), day("2026-10-12", 0), day("2026-10-13", 0)],
      },
      EARLIEST,
    );

    expect(result).toEqual({
      react: [day("2026-10-12", 9)],
      vue: [day("2026-10-11", 4), day("2026-10-12", 0)],
    });
  });

  test("keeps real zeros of a dormant package up to the horizon", () => {
    const result = trimToDataHorizon(
      {
        react: [
          day("2026-10-04", 5),
          day("2026-10-12", 9),
          day("2026-10-13", 0),
        ],
        dormant: [
          day("2026-10-04", 1),
          day("2026-10-12", 0),
          day("2026-10-13", 0),
        ],
      },
      EARLIEST,
    );

    expect(result.dormant).toEqual([
      day("2026-10-04", 1),
      day("2026-10-12", 0),
    ]);
  });

  test("never trims earlier than the earliest horizon", () => {
    const result = trimToDataHorizon(
      {
        dormant: [
          day("2026-10-01", 3),
          day("2026-10-10", 0),
          day("2026-10-13", 0),
        ],
      },
      EARLIEST,
    );

    expect(result.dormant).toEqual([day("2026-10-01", 3)]);
  });

  test("keeps zeros through the earliest horizon for a dormant-only request", () => {
    const result = trimToDataHorizon(
      {
        dormant: [
          day("2026-10-01", 3),
          day("2026-10-09", 0),
          day("2026-10-13", 0),
        ],
      },
      EARLIEST,
    );

    expect(result.dormant).toEqual([
      day("2026-10-01", 3),
      day("2026-10-09", 0),
    ]);
  });

  test("leaves missing and all-zero series untouched", () => {
    const result = trimToDataHorizon(
      {
        missing: null,
        empty: [day("2026-10-08", 1)].slice(1),
        zeros: [day("2026-10-08", 0)],
      },
      EARLIEST,
    );

    expect(result).toEqual({
      missing: null,
      empty: [],
      zeros: [day("2026-10-08", 0)],
    });
  });
});
