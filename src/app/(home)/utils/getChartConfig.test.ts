import type { ProjectStats } from "@/lib/queries/useProjectsStats";
import { buildProjectStats, buildSuccessQuery } from "@/test/factories";
import type { UseQueryResult } from "@tanstack/react-query";
import { describe, expect, test } from "vitest";
import getChartConfig from "./getChartConfig";

const pendingStats = { data: undefined } as UseQueryResult<ProjectStats>;

const RELEASE = { version: "2.0.0", date: "2024-02-01" } as const;

describe("getChartConfig", () => {
  test("builds config keyed by normalized name with the latest release and color index", () => {
    const stats = [
      buildSuccessQuery(buildProjectStats("@scope/pkg")),
      buildSuccessQuery(buildProjectStats("vue")),
    ];

    expect(getChartConfig(stats, [RELEASE, null])).toEqual({
      _x_scope_x_pkg: {
        label: "@scope/pkg",
        color: "hsl(var(--chart-1))",
        latestRelease: RELEASE,
      },
      vue: { label: "vue", color: "hsl(var(--chart-2))", latestRelease: null },
    });
  });

  test("skips stats without a project name", () => {
    expect(getChartConfig([pendingStats], [])).toEqual({});
  });

  test("uses a null release when package info is missing", () => {
    const stats = [buildSuccessQuery(buildProjectStats("react"))];

    expect(getChartConfig(stats, [])).toEqual({
      react: {
        label: "react",
        color: "hsl(var(--chart-1))",
        latestRelease: null,
      },
    });
  });
});
