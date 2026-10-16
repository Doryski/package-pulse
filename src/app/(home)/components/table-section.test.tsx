import getStatsMatrix, {
  GetStatsMatrixResult,
  StatsRow,
} from "@/app/(home)/utils/getStatsMatrix";
import {
  loadBundleSize,
  loadDepsDev,
  loadPackageInfo,
} from "@/api/packageData";
import LocalStorageKey from "@/lib/enums/LocalStorageKey";
import { getProjectStatsQueryKey } from "@/lib/queries/keys";
import AppError from "@/lib/utils/AppError";
import { exportCsv, exportJson } from "@/lib/utils/exportUtils";
import {
  buildProjectStats,
  buildSuccessQuery,
  FIXED_TIMESTAMP,
} from "@/test/factories";
import { createTestQueryClient, renderWithForm } from "@/test/render";
import { screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { statsTableColumns } from "./stats-table-columns";
import TableSection from "./table-section";

vi.mock("@/app/(home)/utils/getStatsMatrix", () => ({ default: vi.fn() }));
vi.mock("@/api/packageData", () => ({
  loadPackageInfo: vi.fn(),
  loadBundleSize: vi.fn(),
  loadDepsDev: vi.fn(),
}));
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
  latestRelease: null,
};

const projectsStats = PROJECTS.map((name) =>
  buildSuccessQuery(buildProjectStats(name)),
);

const PACKAGE_INFO_BY_NAME = new Map<string, object>([
  ["beta", PACKAGE_INFO],
  ["gamma", { ...PACKAGE_INFO, projectName: "gamma", license: "MIT, ISC" }],
]);

const BUNDLE_SIZE_BY_SPEC = new Map<string, object>([
  [
    "beta@2.0.0",
    { size: 1000, gzip: 400, treeShakeable: true, dependencyCount: 3 },
  ],
]);

const DEPS_DEV_BY_NAME = new Map<string, object>([
  ["beta", { vulnerabilityCount: 1, healthScore: 7, licenses: ["MIT"] }],
  ["alpha", { vulnerabilityCount: 0, licenses: "MIT" }],
]);

const resolveFrom = (source: Map<string, object>, key: string) => {
  const value = source.get(key);
  if (!value) return Promise.reject(new AppError("missing", { status: 404 }));
  return Promise.resolve(value as never);
};

const mockSources = () => {
  vi.mocked(getStatsMatrix).mockReturnValue({
    stats: ROWS,
    dates: EMPTY_DATES,
  });
  vi.mocked(loadPackageInfo).mockImplementation((name) =>
    resolveFrom(PACKAGE_INFO_BY_NAME, name),
  );
  vi.mocked(loadBundleSize).mockImplementation((name, version) =>
    resolveFrom(BUNDLE_SIZE_BY_SPEC, `${name}@${version}`),
  );
  vi.mocked(loadDepsDev).mockImplementation((name) =>
    resolveFrom(DEPS_DEV_BY_NAME, name),
  );
};

const renderSection = (
  stats: object[] = projectsStats,
  projects: string[] = [...PROJECTS],
  queryClient = createTestQueryClient(),
) =>
  renderWithForm(
    <TableSection projectsStats={stats as never} />,
    { projects },
    { queryClient },
  );

const settleStats = (
  queryClient: ReturnType<typeof createTestQueryClient>,
  names: readonly string[],
) =>
  Promise.all(
    names.map((name) =>
      queryClient
        .prefetchQuery({
          queryKey: getProjectStatsQueryKey(name),
          queryFn: () => Promise.reject(new Error("failed")),
        })
        .catch(() => undefined),
    ),
  );

const expectNoPackageDataRequests = () => {
  expect(loadPackageInfo).not.toHaveBeenCalled();
  expect(loadBundleSize).not.toHaveBeenCalled();
  expect(loadDepsDev).not.toHaveBeenCalled();
};

const lastExportRows = (exporter: typeof exportCsv | typeof exportJson) =>
  waitFor(() => {
    const rows = vi.mocked(exporter).mock.lastCall?.[1];
    if (!rows) throw new Error("export not called yet");
    return rows;
  });

const tableRowNames = () =>
  within(screen.getByRole("table"))
    .getAllByRole("row")
    .slice(1)
    .map((row) => within(row).getAllByRole("cell")[0]?.textContent);

const exportedNames = async (exporter: typeof exportCsv | typeof exportJson) =>
  (await lastExportRows(exporter)).map((row) =>
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

  it("renders a skeleton table with real headers while stats are pending", () => {
    renderSection([]);

    const section = screen.getByRole("heading", {
      name: "Downloads by project",
    }).parentElement?.parentElement;
    expect(section).not.toHaveClass("hidden");
    expect(section).toHaveAttribute("aria-busy", "true");
    const skeleton = screen.getByTestId("stats-table-skeleton");
    expect(
      within(skeleton)
        .getAllByRole("columnheader")
        .map((head) => head.textContent),
    ).toEqual(statsTableColumns.map(({ label }) => label));
    expect(within(skeleton).getAllByRole("columnheader")[0]).toHaveClass(
      "sticky",
      "bg-slate-100",
      "dark:bg-slate-900",
    );
    const rows = within(skeleton).getAllByRole("row").slice(1);
    expect(rows).toHaveLength(PROJECTS.length);
    expect(within(rows[0]!).getAllByRole("cell")[0]).toHaveClass("sticky");
    expect(skeleton.querySelectorAll('[aria-hidden="true"]').length).toBe(
      PROJECTS.length * 8,
    );
    expect(screen.getByRole("button", { name: "CSV" })).toBeDisabled();
  });

  it("shows skeleton rows only for packages still pending", async () => {
    const queryClient = createTestQueryClient();
    await settleStats(queryClient, ["beta"]);
    renderSection([], [...PROJECTS], queryClient);

    const skeleton = screen.getByTestId("stats-table-skeleton");
    expect(within(skeleton).getAllByRole("row").slice(1)).toHaveLength(2);
  });

  it("is hidden when no project is selected", () => {
    vi.mocked(getStatsMatrix).mockReturnValue({
      stats: [],
      dates: EMPTY_DATES,
    });
    renderSection([], []);

    const heading = screen.getByRole("heading", {
      name: "Downloads by project",
      hidden: true,
    });
    expect(heading.parentElement?.parentElement).toHaveClass("hidden");
    expect(heading.parentElement?.parentElement).not.toHaveAttribute(
      "aria-busy",
    );
  });

  it("is hidden when every stats query failed", async () => {
    const queryClient = createTestQueryClient();
    await settleStats(queryClient, PROJECTS);
    renderSection([], [...PROJECTS], queryClient);

    const heading = screen.getByRole("heading", {
      name: "Downloads by project",
      hidden: true,
    });
    expect(heading.parentElement?.parentElement).toHaveClass("hidden");
    expect(screen.queryByTestId("stats-table-skeleton")).toBeNull();
  });

  it("requests no package info, bundle size or deps.dev data until export", async () => {
    const { user } = renderSection();

    await user.click(header("Project name"));
    await user.click(screen.getByRole("radio", { name: "Toggle info" }));
    await user.click(screen.getByRole("radio", { name: "Toggle stats" }));
    expectNoPackageDataRequests();

    await user.click(screen.getByRole("button", { name: "CSV" }));
    await lastExportRows(exportCsv);

    expect(loadPackageInfo).toHaveBeenCalledTimes(PROJECTS.length);
    expect(loadDepsDev).toHaveBeenCalledTimes(PROJECTS.length);
    expect(loadBundleSize).toHaveBeenCalledWith(
      "beta",
      "2.0.0",
      expect.any(AbortSignal),
    );
  });

  it("reuses cached package data on repeated exports", async () => {
    const { user } = renderSection();

    await user.click(screen.getByRole("button", { name: "JSON" }));
    await lastExportRows(exportJson);
    await user.click(screen.getByRole("button", { name: "CSV" }));
    await lastExportRows(exportCsv);

    const callsFor = (calls: unknown[][], name: string) =>
      calls.filter(([called]) => called === name);
    expect(
      callsFor(vi.mocked(loadPackageInfo).mock.calls, "beta"),
    ).toHaveLength(1);
    expect(callsFor(vi.mocked(loadDepsDev).mock.calls, "beta")).toHaveLength(1);
    expect(callsFor(vi.mocked(loadBundleSize).mock.calls, "beta")).toHaveLength(
      1,
    );
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
    await lastExportRows(exportCsv);

    expect(exportCsv).toHaveBeenCalledWith(
      `package-pulse-${FIXED_TIMESTAMP}`,
      expect.any(Array),
    );
    expect(await exportedNames(exportCsv)).toEqual(tableRowNames());
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
      expect(await exportedNames(exporter)).toEqual(["alpha", "beta", "gamma"]);
      expect(await exportedNames(exporter)).toEqual(tableRowNames());

      await user.click(header("YoY Month"));
      await user.click(screen.getByRole("button", { name: button }));
      expect(await exportedNames(exporter)).toEqual(["gamma", "beta", "alpha"]);
      expect(await exportedNames(exporter)).toEqual(tableRowNames());
    },
  );

  it("exports JSON with the timestamped filename", async () => {
    const { user } = renderSection();

    await user.click(screen.getByRole("button", { name: "JSON" }));
    await lastExportRows(exportJson);

    expect(exportJson).toHaveBeenCalledWith(
      `package-pulse-${FIXED_TIMESTAMP}`,
      expect.any(Array),
    );
    expect(exportCsv).not.toHaveBeenCalled();
  });

  it("merges stats, package info, bundle size and deps.dev into export rows", async () => {
    const { user } = renderSection();

    await user.click(screen.getByRole("button", { name: "JSON" }));

    const rows = await lastExportRows(exportJson);
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
    vi.mocked(loadPackageInfo).mockResolvedValue({
      ...PACKAGE_INFO,
      latestVersion: null,
    } as never);
    vi.mocked(loadDepsDev).mockRejectedValue(new Error("upstream"));
    const { user } = renderSection();

    await user.click(screen.getByRole("button", { name: "CSV" }));

    const rows = await lastExportRows(exportCsv);
    expect(loadBundleSize).not.toHaveBeenCalled();
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
