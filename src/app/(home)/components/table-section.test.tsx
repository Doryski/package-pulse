import getStatsMatrix, {
  GetStatsMatrixResult,
  StatsRow,
} from "@/app/(home)/utils/getStatsMatrix";
import LocalStorageKey from "@/lib/enums/LocalStorageKey";
import useBundleSize from "@/lib/queries/useBundleSize";
import useDepsDev from "@/lib/queries/useDepsDev";
import usePackagesInfo from "@/lib/queries/usePackagesInfo";
import { exportCsv, exportJson } from "@/lib/utils/exportUtils";
import {
  buildProjectStats,
  buildSuccessQuery,
  FIXED_TIMESTAMP,
} from "@/test/factories";
import { renderWithForm } from "@/test/render";
import { screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import TableSection from "./table-section";

vi.mock("@/app/(home)/utils/getStatsMatrix", () => ({ default: vi.fn() }));
vi.mock("@/lib/queries/usePackagesInfo");
vi.mock("@/lib/queries/useBundleSize");
vi.mock("@/lib/queries/useDepsDev");
vi.mock("@/lib/utils/exportUtils", () => ({
  exportCsv: vi.fn(),
  exportJson: vi.fn(),
}));
vi.mock("./projects-info-table", () => ({
  default: () => <div data-testid="projects-info-table" />,
}));

const PROJECTS = ["beta", "alpha", "gamma"] as const;

const EMPTY_DATES = {
  recentFullWeek: undefined,
  previousFullWeek: undefined,
  recentFullMonth: undefined,
  previousFullMonth: undefined,
  recentFullYear: undefined,
  previousFullYear: undefined,
  lastYearsReferenceWeek: undefined,
  lastYearsReferenceMonth: undefined,
  vibeCodingEraReferenceWeek: undefined,
} as const satisfies GetStatsMatrixResult["dates"];

const change = (nominal: number, percentage: number) => ({
  nominal,
  percentage,
});

const buildRow = (
  projectName: string,
  yoyMonth: number,
  weekly: number,
  overrides: Partial<StatsRow> = {},
): StatsRow => ({
  projectName,
  color: "#000000",
  weeklyChange: change(weekly * 10, weekly),
  monthlyChange: change(2, 2),
  yearlyChange: change(3, 3),
  yoyWeekChange: change(4, 4),
  yoyMonthChange: change(yoyMonth * 10, yoyMonth),
  vibeCodingEraChange: change(5, 5),
  breakDropIndicator: {
    christmasDropPercentage: 12,
    weekendDropPercentage: 30,
    corporateUsageScore: 55,
    corporateUsageLevel: "moderate",
    hasEnoughData: true,
  },
  ...overrides,
});

const ROWS = [
  buildRow("beta", 20, 1),
  buildRow("alpha", 5, 30),
  buildRow("gamma", 50, 10, {
    weeklyChange: null,
    monthlyChange: null,
    yearlyChange: null,
    yoyWeekChange: null,
    breakDropIndicator: {
      christmasDropPercentage: null,
      weekendDropPercentage: 0,
      corporateUsageScore: null,
      corporateUsageLevel: null,
      hasEnoughData: false,
    },
  }),
];

const PACKAGE_INFO = {
  projectName: "beta",
  repoName: "org/beta",
  latestVersion: { version: "2.0.0" },
  lastReleaseDate: "2024-01-10",
  contributorsCount: 4,
  dependenciesCount: 1,
  devDependenciesCount: 2,
  homepage: "https://beta.dev",
  license: "MIT",
  repositoryUrl: "https://github.com/org/beta",
  description: "Beta package",
  createdAt: "2020-01-01",
  versions: [],
};

const projectsStats = PROJECTS.map((name) =>
  buildSuccessQuery(buildProjectStats(name)),
);

const success = <T,>(data: T) => ({ data, isSuccess: true, isLoading: false });

const mockSources = () => {
  vi.mocked(getStatsMatrix).mockReturnValue({
    stats: ROWS,
    dates: EMPTY_DATES,
  });
  vi.mocked(usePackagesInfo).mockReturnValue([
    success(PACKAGE_INFO),
    { data: { ...PACKAGE_INFO, projectName: "alpha" }, isSuccess: false },
    success({ ...PACKAGE_INFO, projectName: "gamma", license: ["MIT", "ISC"] }),
  ] as never);
  vi.mocked(useBundleSize).mockReturnValue([
    success({ size: 1000, gzip: 400, treeShakeable: true, dependencyCount: 3 }),
    success(null),
  ] as never);
  vi.mocked(useDepsDev).mockReturnValue([
    success({ vulnerabilityCount: 1, healthScore: 7, licenses: ["MIT"] }),
    success({ vulnerabilityCount: 0, licenses: "MIT" }),
  ] as never);
};

const renderSection = (stats: object[] = projectsStats) =>
  renderWithForm(<TableSection projectsStats={stats as never} />, {
    projects: [...PROJECTS],
  });

const tableRowNames = () =>
  within(screen.getByRole("table"))
    .getAllByRole("row")
    .slice(1)
    .map((row) => within(row).getAllByRole("cell")[0]?.textContent);

const exportedNames = (exporter: typeof exportCsv) =>
  vi
    .mocked(exporter)
    .mock.lastCall?.[1].map((row) =>
      row && typeof row === "object" && "projectName" in row
        ? row.projectName
        : undefined,
    );

const header = (name: string) =>
  screen.getByRole("columnheader", { name: new RegExp(`^${name}`) });

describe("TableSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    vi.spyOn(Date.prototype, "getTime").mockReturnValue(FIXED_TIMESTAMP);
    mockSources();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows a loading message while any project is loading", () => {
    renderSection([...projectsStats, { isLoading: true }]);

    expect(screen.getByText("Loading...")).toBeInTheDocument();
    expect(screen.queryByRole("table")).toBeNull();
  });

  it("is hidden when there are no projects", () => {
    vi.mocked(getStatsMatrix).mockReturnValue({
      stats: [],
      dates: EMPTY_DATES,
    });
    renderSection([]);

    const heading = screen.getByRole("heading", {
      name: "Downloads by project",
      hidden: true,
    });
    expect(heading.parentElement?.parentElement).toHaveClass("hidden");
  });

  it("is visible with projects and defaults to the stats table", () => {
    renderSection();

    const heading = screen.getByRole("heading", {
      name: "Downloads by project",
    });
    expect(heading.parentElement?.parentElement).not.toHaveClass("hidden");
    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Toggle stats" })).toHaveAttribute(
      "data-state",
      "on",
    );
    expect(tableRowNames()).toEqual(["gamma", "beta", "alpha"]);
    expect(header("YoY Month")).toHaveAttribute("aria-sort", "descending");
  });

  it("toggles between the stats and info tables", async () => {
    const { user } = renderSection();

    await user.click(screen.getByRole("radio", { name: "Toggle info" }));
    expect(screen.getByTestId("projects-info-table")).toBeInTheDocument();
    expect(screen.queryByRole("table")).toBeNull();

    await user.click(screen.getByRole("radio", { name: "Toggle stats" }));
    expect(screen.queryByTestId("projects-info-table")).toBeNull();
    expect(screen.getByRole("table")).toBeInTheDocument();
  });

  it("keeps the active view selected when its toggle is clicked again", async () => {
    const { user } = renderSection();

    await user.click(screen.getByRole("radio", { name: "Toggle info" }));
    await user.click(screen.getByRole("radio", { name: "Toggle info" }));

    expect(screen.getByTestId("projects-info-table")).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Toggle info" })).toBeChecked();
    expect(
      screen.getByRole("radiogroup", { name: "Table view" }),
    ).toBeInTheDocument();
  });

  it("sorts by header click and toggles direction on repeat", async () => {
    const { user } = renderSection();

    await user.click(header("Project name"));
    expect(header("Project name")).toHaveAttribute("aria-sort", "descending");
    expect(header("YoY Month")).toHaveAttribute("aria-sort", "none");
    expect(tableRowNames()).toEqual(["gamma", "beta", "alpha"]);

    await user.click(header("Project name"));
    expect(header("Project name")).toHaveAttribute("aria-sort", "ascending");
    expect(tableRowNames()).toEqual(["alpha", "beta", "gamma"]);
    expect(localStorage.getItem(LocalStorageKey.TABLE_SORT_COLUMN)).toBe(
      JSON.stringify("projectName"),
    );
    expect(localStorage.getItem(LocalStorageKey.TABLE_SORT_DIRECTION)).toBe(
      JSON.stringify("asc"),
    );
  });

  it("sorts with Enter and Space on a focused header", async () => {
    const { user } = renderSection();

    header("Weekly").focus();
    await user.keyboard("{Enter}");
    expect(header("Weekly")).toHaveAttribute("aria-sort", "descending");
    expect(tableRowNames()).toEqual(["alpha", "beta", "gamma"]);

    await user.keyboard(" ");
    expect(header("Weekly")).toHaveAttribute("aria-sort", "ascending");
    expect(tableRowNames()).toEqual(["gamma", "beta", "alpha"]);
  });

  it("restores the persisted sort on mount", () => {
    localStorage.setItem(
      LocalStorageKey.TABLE_SORT_COLUMN,
      JSON.stringify("projectName"),
    );
    localStorage.setItem(
      LocalStorageKey.TABLE_SORT_DIRECTION,
      JSON.stringify("asc"),
    );
    renderSection();

    expect(header("Project name")).toHaveAttribute("aria-sort", "ascending");
    expect(tableRowNames()).toEqual(["alpha", "beta", "gamma"]);
  });

  it("exports CSV in the default table order", async () => {
    const { user } = renderSection();

    await user.click(screen.getByRole("button", { name: "CSV" }));

    expect(exportCsv).toHaveBeenCalledWith(
      `package-pulse-${FIXED_TIMESTAMP}`,
      expect.any(Array),
    );
    expect(exportedNames(exportCsv)).toEqual(tableRowNames());
    expect(exportJson).not.toHaveBeenCalled();
  });

  it.each([
    ["CSV", exportCsv],
    ["JSON", exportJson],
  ] as const)(
    "exports %s using the same sort as the table",
    async (button, exporter) => {
      const { user } = renderSection();

      await user.click(header("Project name"));
      await user.click(header("Project name"));
      await user.click(screen.getByRole("button", { name: button }));
      expect(exportedNames(exporter)).toEqual(["alpha", "beta", "gamma"]);
      expect(exportedNames(exporter)).toEqual(tableRowNames());

      await user.click(header("YoY Month"));
      await user.click(screen.getByRole("button", { name: button }));
      expect(exportedNames(exporter)).toEqual(["gamma", "beta", "alpha"]);
      expect(exportedNames(exporter)).toEqual(tableRowNames());
    },
  );

  it("exports JSON with the timestamped filename", async () => {
    const { user } = renderSection();

    await user.click(screen.getByRole("button", { name: "JSON" }));

    expect(exportJson).toHaveBeenCalledWith(
      `package-pulse-${FIXED_TIMESTAMP}`,
      expect.any(Array),
    );
    expect(exportCsv).not.toHaveBeenCalled();
  });

  it("merges stats, package info, bundle size and deps.dev into export rows", async () => {
    const { user } = renderSection();

    await user.click(screen.getByRole("button", { name: "JSON" }));

    const rows = vi.mocked(exportJson).mock.lastCall?.[1];
    expect(rows).toEqual([
      {
        projectName: "gamma",
        weeklyChange_nominal: null,
        weeklyChange_percentage: null,
        monthlyChange_nominal: null,
        monthlyChange_percentage: null,
        yearlyChange_nominal: null,
        yearlyChange_percentage: null,
        yoyWeekChange_nominal: null,
        yoyWeekChange_percentage: null,
        yoyMonthChange_nominal: 500,
        yoyMonthChange_percentage: 50,
        breakDropPercentage: null,
        weekendDropPercentage: 0,
        corporateUsageScore: null,
        corporateUsageLevel: null,
        repoName: "org/beta",
        latestVersion: "2.0.0",
        lastReleaseDate: "2024-01-10",
        contributorsCount: 4,
        dependenciesCount: 1,
        devDependenciesCount: 2,
        homepage: "https://beta.dev",
        license: "MIT, ISC",
        repositoryUrl: "https://github.com/org/beta",
        description: "Beta package",
        createdAt: "2020-01-01",
        bundleSizeMin: null,
        bundleSizeGzip: null,
        treeShakeable: null,
        dependencyCount: null,
        vulnerabilityCount: null,
        healthScore: null,
        depsDevLicenses: null,
      },
      {
        projectName: "beta",
        weeklyChange_nominal: 10,
        weeklyChange_percentage: 1,
        monthlyChange_nominal: 2,
        monthlyChange_percentage: 2,
        yearlyChange_nominal: 3,
        yearlyChange_percentage: 3,
        yoyWeekChange_nominal: 4,
        yoyWeekChange_percentage: 4,
        yoyMonthChange_nominal: 200,
        yoyMonthChange_percentage: 20,
        breakDropPercentage: 12,
        weekendDropPercentage: 30,
        corporateUsageScore: 55,
        corporateUsageLevel: "moderate",
        repoName: "org/beta",
        latestVersion: "2.0.0",
        lastReleaseDate: "2024-01-10",
        contributorsCount: 4,
        dependenciesCount: 1,
        devDependenciesCount: 2,
        homepage: "https://beta.dev",
        license: "MIT",
        repositoryUrl: "https://github.com/org/beta",
        description: "Beta package",
        createdAt: "2020-01-01",
        bundleSizeMin: 1000,
        bundleSizeGzip: 400,
        treeShakeable: true,
        dependencyCount: 3,
        vulnerabilityCount: 1,
        healthScore: 7,
        depsDevLicenses: "MIT",
      },
      expect.objectContaining({
        projectName: "alpha",
        repoName: null,
        latestVersion: null,
        license: null,
        bundleSizeMin: null,
        vulnerabilityCount: 0,
        healthScore: null,
        depsDevLicenses: null,
      }),
    ]);
  });

  it("exports nulls for projects missing every optional source", async () => {
    vi.mocked(usePackagesInfo).mockReturnValue([
      success({ ...PACKAGE_INFO, latestVersion: null }),
    ] as never);
    vi.mocked(useBundleSize).mockReturnValue([]);
    vi.mocked(useDepsDev).mockReturnValue([]);
    const { user } = renderSection();

    await user.click(screen.getByRole("button", { name: "CSV" }));

    const rows = vi.mocked(exportCsv).mock.lastCall?.[1];
    expect(rows).toContainEqual(
      expect.objectContaining({
        projectName: "beta",
        latestVersion: null,
        bundleSizeGzip: null,
        treeShakeable: null,
        healthScore: null,
      }),
    );
  });

  it("exposes a display name for devtools", () => {
    expect(TableSection.displayName).toBe("TableSection");
  });
});
