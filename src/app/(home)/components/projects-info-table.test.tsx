import { TooltipProvider } from "@/components/ui/tooltip";
import useBundleSize from "@/lib/queries/useBundleSize";
import useDepsDev from "@/lib/queries/useDepsDev";
import useGithubContributorsCount from "@/lib/queries/useGithubContributorsCount";
import useGithubPullRequestsCount from "@/lib/queries/useGithubPullRequestsCount";
import useGithubRepoInfo from "@/lib/queries/useGithubRepoInfo";
import usePackagesInfo from "@/lib/queries/usePackagesInfo";
import AppError from "@/lib/utils/AppError";
import { renderWithForm } from "@/test/render";
import { screen, within } from "@testing-library/react";
import { subDays } from "date-fns";
import { ImgHTMLAttributes } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { formatDate } from "../utils/date-utils";
import ProjectsInfoTable from "./projects-info-table";

vi.mock("@/lib/queries/usePackagesInfo");
vi.mock("@/lib/queries/useBundleSize");
vi.mock("@/lib/queries/useDepsDev");
vi.mock("@/lib/queries/useGithubRepoInfo");
vi.mock("@/lib/queries/useGithubPullRequestsCount");
vi.mock("@/lib/queries/useGithubContributorsCount");
vi.mock("next/image", () => ({
  default: ({ alt, src }: ImgHTMLAttributes<HTMLImageElement>) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={alt} src={src} />
  ),
}));

const COLUMN = {
  name: 0,
  lastRelease: 1,
  created: 2,
  stars: 3,
  issues: 4,
  pullRequests: 5,
  githubContributors: 6,
  contributors: 7,
  deps: 8,
  version: 9,
  license: 10,
  bundle: 11,
  vulnerabilities: 12,
  health: 13,
  links: 14,
} as const;

const HEADERS = [
  "Project name",
  "Last Release",
  "Created",
  "Stars",
  "Issues",
  "Pull Requests",
  "Contributors Github",
  "Contributors",
  "Deps (Dev)",
  "Latest Version",
  "License",
  "Bundle size",
  "Vulnerabilities",
  "Health",
  "Links",
] as const;

const daysAgo = (days: number) => subDays(new Date(), days).toISOString();

const buildPackageInfo = (projectName: string, overrides: object = {}) => ({
  projectName,
  repoName: `${projectName}/${projectName}`,
  latestVersion: "18.2.0",
  lastReleaseDate: daysAgo(10),
  createdAt: "2013-05-29T00:00:00.000Z",
  contributorsCount: 42,
  dependenciesCount: 3,
  devDependenciesCount: 7,
  homepage: `https://${projectName}.dev`,
  license: "MIT",
  repositoryUrl: `git+https://github.com/${projectName}/${projectName}.git`,
  latestRelease: null,
  ...overrides,
});

const success = <T,>(data: T) => ({ data, isLoading: false, isSuccess: true });
const loading = { data: undefined, isLoading: true, isSuccess: false };
const idle = { data: undefined, isLoading: false, isSuccess: false };
const failed = (status: number) => ({
  data: undefined,
  isLoading: false,
  isSuccess: false,
  isError: true,
  error: new AppError("failed", { status }),
});

type HookState = {
  packages: object[];
  bundles?: object[];
  depsDev?: object[];
  repo?: object;
  pullRequests?: object;
  contributors?: object;
};

const mockHooks = ({
  packages,
  bundles = [],
  depsDev = [],
  repo = success({ starsCount: 1200, openIssuesCount: 34 }),
  pullRequests = success(12),
  contributors = success(99),
}: HookState) => {
  vi.mocked(usePackagesInfo).mockReturnValue(packages as never);
  vi.mocked(useBundleSize).mockReturnValue(bundles as never);
  vi.mocked(useDepsDev).mockReturnValue(depsDev as never);
  vi.mocked(useGithubRepoInfo).mockReturnValue(repo as never);
  vi.mocked(useGithubPullRequestsCount).mockReturnValue(pullRequests as never);
  vi.mocked(useGithubContributorsCount).mockReturnValue(contributors as never);
};

const renderTable = (projects: string[] = ["react"]) =>
  renderWithForm(
    <TooltipProvider delayDuration={0}>
      <ProjectsInfoTable />
    </TooltipProvider>,
    { projects },
  );

const bodyRows = () => screen.getAllByRole("row").slice(1);

const cellsOf = (rowIndex = 0) => {
  const row = bodyRows()[rowIndex];
  if (!row) throw new Error(`Missing row ${rowIndex}`);
  return within(row).getAllByRole("cell");
};

const cell = (column: keyof typeof COLUMN, rowIndex = 0) => {
  const found = cellsOf(rowIndex)[COLUMN[column]];
  if (!found) throw new Error(`Missing ${column} cell`);
  return found;
};

const dotColor = (element: HTMLElement) =>
  element.querySelector<HTMLElement>(".rounded-full")?.style.backgroundColor;

const hoverAndGetTooltip = async (
  user: ReturnType<typeof renderTable>["user"],
  element: Element,
) => {
  await user.hover(element);
  return screen.findByRole("tooltip");
};

describe("ProjectsInfoTable", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders every header", () => {
    mockHooks({ packages: [] });
    renderTable([]);

    expect(
      screen.getAllByRole("columnheader").map((head) => head.textContent),
    ).toEqual([...HEADERS]);
    expect(bodyRows()).toHaveLength(0);
  });

  it("queries every hook with the selected projects", () => {
    mockHooks({ packages: [success(buildPackageInfo("react"))] });
    renderTable(["react"]);

    expect(usePackagesInfo).toHaveBeenCalledWith(["react"]);
    expect(useBundleSize).toHaveBeenCalledWith(["react"]);
    expect(useDepsDev).toHaveBeenCalledWith(["react"]);
    expect(useGithubRepoInfo).toHaveBeenCalledWith("react/react", undefined);
    expect(useGithubPullRequestsCount).toHaveBeenCalledWith("react/react");
    expect(useGithubContributorsCount).toHaveBeenCalledWith("react/react");
  });

  it("prefers deps.dev stars and issues over the GitHub fallback", () => {
    const depsDev = success({ starsCount: 5, openIssuesCount: 6 });
    mockHooks({
      packages: [success(buildPackageInfo("react"))],
      depsDev: [depsDev],
      repo: idle,
    });
    renderTable(["react"]);

    expect(useGithubRepoInfo).toHaveBeenCalledWith("react/react", depsDev);
    expect(cell("stars")).toHaveTextContent("5");
    expect(cell("issues")).toHaveTextContent("6");
  });

  it("renders a full row of package info", () => {
    const info = buildPackageInfo("react");
    mockHooks({
      packages: [success(info)],
      bundles: [
        success({
          size: 6_500,
          gzip: 2_500,
          treeShakeable: true,
          dependencyCount: 1,
        }),
      ],
      depsDev: [success({ vulnerabilityCount: 0, healthScore: 8.46 })],
    });
    renderTable();

    expect(cell("name")).toHaveTextContent("react");
    expect(cell("lastRelease")).toHaveTextContent(
      formatDate(info.lastReleaseDate),
    );
    expect(cell("lastRelease")).toHaveTextContent(/\(.+ ago\)/);
    expect(dotColor(cell("lastRelease"))).toBe("green");
    expect(cell("created")).toHaveTextContent(formatDate(info.createdAt));
    expect(cell("created")).toHaveTextContent(/\(.+ ago\)/);
    expect(cell("stars")).toHaveTextContent("1200");
    expect(cell("issues")).toHaveTextContent("34");
    expect(cell("pullRequests")).toHaveTextContent("12");
    expect(cell("githubContributors")).toHaveTextContent("99");
    expect(cell("contributors")).toHaveTextContent("42");
    expect(cell("deps")).toHaveTextContent("3 (7)");
    expect(cell("version")).toHaveTextContent("18.2.0");
    expect(cell("license")).toHaveTextContent("MIT");
    expect(cell("bundle")).toHaveTextContent("6.5KB min");
    expect(cell("bundle")).toHaveTextContent("2.5KB gz");
    expect(cell("bundle")).toHaveTextContent("Tree-shake");
    expect(dotColor(cell("bundle"))).toBe("green");
    expect(cell("vulnerabilities")).toHaveTextContent("0");
    expect(dotColor(cell("vulnerabilities"))).toBe("green");
    expect(cell("health")).toHaveTextContent("8.5 / 10");
    expect(dotColor(cell("health"))).toBe("green");
  });

  it("renders homepage, npm and GitHub links opening in a new tab", () => {
    mockHooks({ packages: [success(buildPackageInfo("react"))] });
    renderTable();

    const links = [
      ["react homepage", "https://react.dev/"],
      ["react on npm", "https://www.npmjs.com/package/react"],
      ["react GitHub repository", "https://github.com/react/react"],
    ] as const;

    links.forEach(([name, href]) => {
      const link = screen.getByRole("link", { name });
      expect(link).toHaveAttribute("href", href);
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", "noopener noreferrer");
    });
    expect(screen.getByRole("img", { name: "NPM Logo" })).toHaveAttribute(
      "src",
      "/images/npm-logo.svg",
    );
  });

  it("renders dashes and omits links when data is missing", () => {
    mockHooks({
      packages: [
        success(
          buildPackageInfo("bare", {
            repoName: null,
            lastReleaseDate: null,
            createdAt: null,
            dependenciesCount: null,
            devDependenciesCount: null,
            homepage: "javascript:alert(1)",
            repositoryUrl: null,
          }),
        ),
      ],
      bundles: [success(null)],
      depsDev: [success(null)],
      repo: idle,
      pullRequests: idle,
      contributors: idle,
    });
    renderTable(["bare"]);

    expect(cell("lastRelease")).toHaveTextContent(/^-$/);
    expect(cell("created")).toHaveTextContent(/^-$/);
    expect(cell("stars")).toHaveTextContent(/^-$/);
    expect(cell("issues")).toHaveTextContent(/^-$/);
    expect(cell("pullRequests")).toHaveTextContent(/^-$/);
    expect(cell("githubContributors")).toHaveTextContent(/^-$/);
    expect(cell("deps")).toHaveTextContent("- ( - )");
    expect(cell("bundle")).toHaveTextContent(/^-$/);
    expect(cell("vulnerabilities")).toHaveTextContent(/^-$/);
    expect(dotColor(cell("vulnerabilities"))).toBe("gray");
    expect(cell("health")).toHaveTextContent(/^-$/);
    expect(dotColor(cell("health"))).toBe("gray");
    expect(screen.queryByRole("link", { name: "bare homepage" })).toBeNull();
    expect(
      screen.queryByRole("link", { name: "bare GitHub repository" }),
    ).toBeNull();
    expect(screen.getByRole("link", { name: "bare on npm" })).toBeVisible();
    expect(useGithubPullRequestsCount).toHaveBeenCalledWith(null);
  });

  it("renders dashes for bundle sizes that are unknown", () => {
    mockHooks({
      packages: [success(buildPackageInfo("react"))],
      bundles: [success({ size: null, gzip: null, treeShakeable: false })],
    });
    renderTable();

    expect(cell("bundle")).toHaveTextContent("- min");
    expect(cell("bundle")).toHaveTextContent("- gz");
    expect(dotColor(cell("bundle"))).toBe("gray");
  });

  it("renders skeletons while every source is loading", () => {
    mockHooks({
      packages: [loading],
      bundles: [loading],
      depsDev: [loading],
      repo: loading,
      pullRequests: loading,
      contributors: loading,
    });
    renderTable();

    cellsOf().forEach((tableCell) => {
      expect(tableCell.querySelector('[aria-hidden="true"]')).toHaveClass(
        "h-4",
        "w-full",
      );
    });
    expect(screen.queryAllByRole("link")).toHaveLength(0);
  });

  it("renders without bundle or deps.dev results for the row", () => {
    mockHooks({ packages: [success(buildPackageInfo("react"))] });
    renderTable();

    expect(cell("bundle")).toHaveTextContent(/^-$/);
    expect(cell("vulnerabilities")).toHaveTextContent(/^-$/);
    expect(cell("health")).toHaveTextContent(/^-$/);
  });

  it("renders the selected name and dashes when package data is missing", () => {
    mockHooks({ packages: [idle], repo: idle });
    renderTable(["ghost"]);

    expect(cell("name")).toHaveTextContent(/^ghost$/);
    expect(cell("contributors")).toHaveTextContent(/^-$/);
    expect(cell("version")).toHaveTextContent(/^-$/);
    expect(cell("license")).toHaveTextContent(/^-$/);
    expect(screen.queryAllByRole("link")).toHaveLength(0);
  });

  it("renders a not-found row for packages missing on npm", () => {
    mockHooks({
      packages: [failed(404), success(buildPackageInfo("vue"))],
      repo: idle,
    });
    renderTable(["missing-pkg", "vue"]);

    const cells = cellsOf(0);
    expect(cells).toHaveLength(2);
    expect(cells[0]).toHaveTextContent(/^missing-pkg$/);
    expect(cells[1]).toHaveTextContent(/^Not found on npm$/);
    expect(cells[1]).toHaveAttribute("colspan", String(HEADERS.length - 1));
    expect(cell("name", 1)).toHaveTextContent(/^vue$/);
  });

  it.each([
    [502, "Unavailable"],
    [500, "Unavailable"],
    [429, "Unavailable (rate limited)"],
  ])(
    "renders dashes with a %i status note in the name cell",
    (status, note) => {
      mockHooks({
        packages: [failed(status)],
        repo: idle,
        pullRequests: idle,
        contributors: idle,
      });
      renderTable(["react"]);

      const nameCell = cell("name");
      expect(within(nameCell).getByText(note)).toHaveClass("sr-only");
      expect(nameCell).toHaveAttribute("title", note);
      expect(cell("lastRelease")).toHaveTextContent(/^-$/);
      expect(cell("version")).toHaveTextContent(/^-$/);
      expect(cell("deps")).toHaveTextContent("- ( - )");
      expect(screen.queryByText("Not found on npm")).toBeNull();
    },
  );

  it("treats a non-AppError failure as unavailable", () => {
    mockHooks({
      packages: [{ ...failed(500), error: new Error("boom") }],
      repo: idle,
    });
    renderTable(["react"]);

    expect(within(cell("name")).getByText("Unavailable")).toHaveClass(
      "sr-only",
    );
  });

  it("gives the sticky name header an opaque background in both themes", () => {
    mockHooks({ packages: [] });
    renderTable([]);

    expect(
      screen.getByRole("columnheader", { name: "Project name" }),
    ).toHaveClass("sticky", "bg-slate-100", "dark:bg-slate-900");
  });

  it("requests GitHub counts as soon as the repo name is known", () => {
    mockHooks({
      packages: [success(buildPackageInfo("react"))],
      depsDev: [loading],
      repo: idle,
      pullRequests: loading,
      contributors: loading,
    });
    renderTable(["react"]);

    expect(useGithubPullRequestsCount).toHaveBeenCalledWith("react/react");
    expect(useGithubContributorsCount).toHaveBeenCalledWith("react/react");
    expect(cell("stars").querySelector('[aria-hidden="true"]')).toHaveClass(
      "h-4",
      "w-full",
    );
  });

  it("marks the table busy while package info loads", () => {
    mockHooks({ packages: [loading] });
    renderTable(["react"]);

    expect(screen.getByRole("table")).toHaveAttribute("aria-busy", "true");
  });

  it("drops aria-busy once package info has loaded", () => {
    mockHooks({ packages: [success(buildPackageInfo("react"))] });
    renderTable(["react"]);

    expect(screen.getByRole("table")).not.toHaveAttribute("aria-busy");
  });

  it.each([
    [10, "green"],
    [120, "yellow"],
    [250, "orange"],
    [400, "red"],
  ])("colors a release %i days old %s", (days, color) => {
    mockHooks({
      packages: [
        success(buildPackageInfo("react", { lastReleaseDate: daysAgo(days) })),
      ],
    });
    renderTable();

    expect(dotColor(cell("lastRelease"))).toBe(color);
  });

  it.each([
    [0, "green"],
    [2, "yellow"],
    [5, "orange"],
    [6, "red"],
  ])("colors %i vulnerabilities %s", (vulnerabilityCount, color) => {
    mockHooks({
      packages: [success(buildPackageInfo("react"))],
      depsDev: [success({ vulnerabilityCount })],
    });
    renderTable();

    expect(cell("vulnerabilities")).toHaveTextContent(
      String(vulnerabilityCount),
    );
    expect(dotColor(cell("vulnerabilities"))).toBe(color);
  });

  it.each([
    [9, "green", "9 / 10"],
    [6.04, "yellow", "6 / 10"],
    [4, "orange", "4 / 10"],
    [1.25, "red", "1.3 / 10"],
  ])("colors health score %d %s", (healthScore, color, label) => {
    mockHooks({
      packages: [success(buildPackageInfo("react"))],
      depsDev: [success({ healthScore })],
    });
    renderTable();

    expect(cell("health")).toHaveTextContent(label);
    expect(dotColor(cell("health"))).toBe(color);
  });

  it.each([
    [
      "Bundle size",
      "Minified and gzipped bundle size (bundlephobia). The dot shows whether the package is tree-shakeable.",
    ],
    ["Vulnerabilities", "Known security vulnerabilities reported by deps.dev."],
    ["Health", "OpenSSF Scorecard health score (0-10) from deps.dev."],
  ])("explains the %s header in a tooltip", async (header, text) => {
    mockHooks({ packages: [] });
    const { user } = renderTable([]);

    const tooltip = await hoverAndGetTooltip(user, screen.getByText(header));

    expect(tooltip).toHaveTextContent(text);
  });

  it.each([
    [true, "Tree-shakeable"],
    [false, "Not tree-shakeable"],
  ])("shows tree-shake status %s in a tooltip", async (treeShakeable, text) => {
    mockHooks({
      packages: [success(buildPackageInfo("react"))],
      bundles: [success({ size: 100, gzip: 50, treeShakeable })],
    });
    const { user } = renderTable();

    const tooltip = await hoverAndGetTooltip(
      user,
      within(cell("bundle")).getByText("Tree-shake"),
    );

    expect(tooltip).toHaveTextContent(new RegExp(`^${text}$`));
  });

  it.each([
    ["react homepage", "Homepage"],
    ["react on npm", "NPM package site"],
    ["react GitHub repository", "GitHub repository"],
  ])("labels the %s link with a tooltip", async (name, text) => {
    mockHooks({ packages: [success(buildPackageInfo("react"))] });
    const { user } = renderTable();

    const tooltip = await hoverAndGetTooltip(
      user,
      screen.getByRole("link", { name }),
    );

    expect(tooltip).toHaveTextContent(text);
  });

  it("renders one row per selected package", () => {
    mockHooks({
      packages: [
        success(buildPackageInfo("react")),
        success(buildPackageInfo("vue")),
      ],
    });
    renderTable(["react", "vue"]);

    expect(bodyRows().map((row) => row.firstChild?.textContent)).toEqual([
      "react",
      "vue",
    ]);
  });

  it("exposes a display name for devtools", () => {
    expect(ProjectsInfoTable.displayName).toBe("ProjectsInfoTable");
  });
});
