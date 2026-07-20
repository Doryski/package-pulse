import { ProjectStats } from "@/lib/queries/useProjectsStats";
import { UseQueryResult } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import { prepareNormalizedChartData } from "./prepareChartData";

const makeQuery = (projectName: string, counts: number[]) =>
  ({
    data: {
      projectName,
      rawSortedData: [],
      groupedByWeekData: counts.map((count, index) => ({
        start: `2024-01-${String(index + 1).padStart(2, "0")}`,
        end: `2024-01-${String(index + 1).padStart(2, "0")}`,
        count,
      })),
    },
  }) as unknown as UseQueryResult<ProjectStats>;

describe("prepareNormalizedChartData", () => {
  it("strips leading zero weeks so week 0 is the first non-zero week", () => {
    const rows = prepareNormalizedChartData([makeQuery("react", [0, 0, 5, 7])]);

    expect(rows[0]).toEqual({ weekIndex: 0, react: 5 });
    expect(rows[1]).toEqual({ weekIndex: 1, react: 7 });
    expect(rows).toHaveLength(2);
  });

  it("aligns two series at week 0 at their own first meaningful week and omits the shorter series' key beyond its length", () => {
    const rows = prepareNormalizedChartData([
      makeQuery("react", [0, 10, 20]),
      makeQuery("vue", [0, 0, 0, 3]),
    ]);

    expect(rows).toEqual([
      { weekIndex: 0, react: 10, vue: 3 },
      { weekIndex: 1, react: 20 },
    ]);
    expect(Object.keys(rows[1] ?? {})).not.toContain("vue");
  });

  it("skips an all-zero series entirely", () => {
    const rows = prepareNormalizedChartData([
      makeQuery("react", [0, 5, 10]),
      makeQuery("dead", [0, 0, 0]),
    ]);

    expect(rows.some((row) => "dead" in row)).toBe(false);
    expect(rows).toEqual([
      { weekIndex: 0, react: 5 },
      { weekIndex: 1, react: 10 },
    ]);
  });

  it("produces rows shaped as { weekIndex: number, [project]: number }", () => {
    const rows = prepareNormalizedChartData([makeQuery("react", [3, 6])]);

    expect(rows).toEqual([
      { weekIndex: 0, react: 3 },
      { weekIndex: 1, react: 6 },
    ]);
    expect(rows.every((row) => typeof row.weekIndex === "number")).toBe(true);
  });
});
