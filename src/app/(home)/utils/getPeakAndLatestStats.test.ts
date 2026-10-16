import { buildProjectStats, buildSuccessQuery } from "@/test/factories";
import type { ProjectStatsQuery } from "@/lib/queries/useProjectsStats";
import { describe, expect, test } from "vitest";
import getPeakAndLatestDownloads from "./getPeakAndLatestStats";

const pendingQuery = { data: undefined } as ProjectStatsQuery;

describe("getPeakAndLatestDownloads", () => {
  test("returns latest (last computed day) and peak downloads per project", () => {
    const stats = buildProjectStats("react", {
      rawSortedData: [
        { date: "2024-01-01", count: 10 },
        { date: "2024-01-02", count: 50 },
        { date: "2024-01-03", count: 20 },
        { date: "2024-01-04", count: 5 },
      ],
    });

    expect(getPeakAndLatestDownloads([buildSuccessQuery(stats)])).toEqual([
      { name: "react", latestDownloads: 5, peakDownloads: 50 },
    ]);
  });

  test("skips queries without data", () => {
    expect(getPeakAndLatestDownloads([pendingQuery])).toEqual([]);
  });

  test("falls back to zero for empty data", () => {
    const stats = buildProjectStats("empty", { rawSortedData: [] });

    expect(getPeakAndLatestDownloads([buildSuccessQuery(stats)])).toEqual([
      { name: "empty", latestDownloads: 0, peakDownloads: 0 },
    ]);
  });
});
