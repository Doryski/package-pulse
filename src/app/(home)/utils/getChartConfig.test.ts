import type { fetchPackageInfo } from "@/api/fetchPackageInfo";
import type { ProjectStats } from "@/lib/queries/useProjectsStats";
import { buildProjectStats, buildSuccessQuery } from "@/test/factories";
import type { UseQueryResult } from "@tanstack/react-query";
import { describe, expect, test } from "vitest";
import getChartConfig from "./getChartConfig";

type PackageInfo = Awaited<ReturnType<typeof fetchPackageInfo>>;

const pendingStats = { data: undefined } as UseQueryResult<ProjectStats>;
const pendingInfo = { data: undefined } as UseQueryResult<PackageInfo, Error>;

const infoWithVersions = buildSuccessQuery({
  versions: [
    { version: "1.0.0", date: "2024-01-01", extra: "ignored" },
    { version: "2.0.0", date: "2024-02-01", extra: "ignored" },
  ],
} as unknown as PackageInfo);

describe("getChartConfig", () => {
  test("builds config keyed by normalized name with versions and color index", () => {
    const stats = [
      buildSuccessQuery(buildProjectStats("@scope/pkg")),
      buildSuccessQuery(buildProjectStats("vue")),
    ];

    expect(getChartConfig(stats, [infoWithVersions, pendingInfo])).toEqual({
      _x_scope_x_pkg: {
        label: "@scope/pkg",
        color: "hsl(var(--chart-1))",
        versions: [
          { version: "1.0.0", date: "2024-01-01" },
          { version: "2.0.0", date: "2024-02-01" },
        ],
      },
      vue: { label: "vue", color: "hsl(var(--chart-2))", versions: [] },
    });
  });

  test("skips stats without a project name", () => {
    expect(getChartConfig([pendingStats], [])).toEqual({});
  });

  test("uses empty versions when package info is missing", () => {
    const stats = [buildSuccessQuery(buildProjectStats("react"))];

    expect(getChartConfig(stats, [])).toEqual({
      react: { label: "react", color: "hsl(var(--chart-1))", versions: [] },
    });
  });
});
