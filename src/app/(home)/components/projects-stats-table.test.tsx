import getStatsMatrix, {
  GetStatsMatrixResult,
  StatsRow,
} from "@/app/(home)/utils/getStatsMatrix";
import { SortColumn, SortDirection } from "@/components/ui/table-head-sortable";
import { TooltipProvider } from "@/components/ui/tooltip";
import { renderWithProviders } from "@/test/render";
import { fireEvent, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ProjectsStatsTable, { ProjectNameCell } from "./projects-stats-table";

vi.mock("@/app/(home)/utils/getStatsMatrix", () => ({ default: vi.fn() }));

const period = (start: string, end: string) => ({ start, end });

const FULL_DATES = {
  recentFullWeek: period("2024-03-18", "2024-03-24"),
  previousFullWeek: period("2024-03-11", "2024-03-17"),
  recentFullMonth: period("2024-03-02", "2024-03-30"),
  previousFullMonth: period("2024-02-02", "2024-02-28"),
  recentFullYear: period("2023-01-02", "2023-12-30"),
  previousFullYear: period("2022-01-02", "2022-12-30"),
  lastYearsReferenceWeek: period("2023-03-18", "2023-03-24"),
  lastYearsReferenceMonth: period("2023-02-26", "2023-03-30"),
  vibeCodingEraReferenceWeek: period("2024-10-07", "2024-10-13"),
} as const satisfies GetStatsMatrixResult["dates"];

const SPLIT_YEAR_DATES = {
  ...FULL_DATES,
  recentFullYear: period("2022-06-02", "2023-06-02"),
} as const satisfies GetStatsMatrixResult["dates"];

const EMPTY_DATES = Object.fromEntries(
  Object.keys(FULL_DATES).map((key) => [key, undefined]),
) as GetStatsMatrixResult["dates"];

const change = (nominal: number, percentage: number) => ({
  nominal,
  percentage,
});

const buildRow = (
  projectName: string,
  percentage: number,
  overrides: Partial<StatsRow> = {},
): StatsRow => ({
  projectName,
  color: "#123456",
  weeklyChange: change(percentage * 10, percentage),
  monthlyChange: change(percentage * 20, -percentage),
  yearlyChange: change(percentage * 30, percentage),
  yoyWeekChange: change(percentage * 40, percentage),
  yoyMonthChange: change(percentage * 50, percentage),
  vibeCodingEraChange: change(percentage * 60, percentage),
  breakDropIndicator: {
    christmasDropPercentage: null,
    weekendDropPercentage: 10,
    corporateUsageScore: percentage,
    corporateUsageLevel: "high",
    hasEnoughData: true,
  },
  ...overrides,
});

const ROWS = [
  buildRow("beta", 20),
  buildRow("alpha", 5),
  buildRow("gamma", 50),
] as const;

const mockMatrix = (
  stats: StatsRow[] = [...ROWS],
  dates: GetStatsMatrixResult["dates"] = FULL_DATES,
) => vi.mocked(getStatsMatrix).mockReturnValue({ stats, dates });

type TableProps = {
  sortColumn?: SortColumn;
  sortDirection?: SortDirection;
  onSort?: (column: SortColumn) => void;
};

const renderTable = ({
  sortColumn = "yoyMonth",
  sortDirection = "desc",
  onSort = vi.fn(),
}: TableProps = {}) =>
  renderWithProviders(
    <TooltipProvider delayDuration={0}>
      <ProjectsStatsTable
        projectsStats={[]}
        sortColumn={sortColumn}
        sortDirection={sortDirection}
        onSort={onSort}
      />
    </TooltipProvider>,
  );

const header = (name: string) =>
  screen.getByRole("columnheader", { name: new RegExp(`^${name}`) });

const rowNames = () =>
  screen
    .getAllByRole("row")
    .slice(1)
    .map((row) => within(row).getAllByRole("cell")[0]?.textContent);

const hoverHeaderInfo = async (
  user: ReturnType<typeof renderTable>["user"],
  name: string,
) => {
  const icon = header(name).querySelector("svg");
  if (!icon) throw new Error(`No tooltip icon in ${name} header`);
  await user.hover(icon);
  return screen.findByRole("tooltip");
};

const HEADERS = [
  "Project name",
  "Weekly",
  "Monthly",
  "Yearly",
  "YoY Week",
  "YoY Month",
  "Vibe Coding Era",
  "Break Drop",
] as const;

describe("ProjectsStatsTable", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMatrix();
  });

  it("renders every sortable header", () => {
    renderTable();

    expect(
      screen.getAllByRole("columnheader").map((cell) => cell.textContent),
    ).toEqual(HEADERS.map((name) => expect.stringContaining(name)));
  });

  it("orders rows by the given sort and marks the header with aria-sort", () => {
    renderTable({ sortColumn: "weekly", sortDirection: "desc" });

    expect(rowNames()).toEqual(["gamma", "beta", "alpha"]);
    expect(header("Weekly")).toHaveAttribute("aria-sort", "descending");
    expect(header("Project name")).toHaveAttribute("aria-sort", "none");
    expect(screen.getByRole("table")).toHaveAttribute(
      "data-sort-column",
      "weekly",
    );
    expect(screen.getByRole("table")).toHaveAttribute(
      "data-sort-direction",
      "desc",
    );
  });

  it("sorts by project name ascending", () => {
    renderTable({ sortColumn: "projectName", sortDirection: "asc" });

    expect(rowNames()).toEqual(["alpha", "beta", "gamma"]);
    expect(header("Project name")).toHaveAttribute("aria-sort", "ascending");
  });

  it("re-orders rows when sort props change", () => {
    const { rerender } = renderTable({
      sortColumn: "monthly",
      sortDirection: "desc",
    });
    expect(rowNames()).toEqual(["alpha", "beta", "gamma"]);

    rerender(
      <ProjectsStatsTable
        projectsStats={[]}
        sortColumn="monthly"
        sortDirection="asc"
        onSort={vi.fn()}
      />,
    );

    expect(rowNames()).toEqual(["gamma", "beta", "alpha"]);
  });

  it.each([
    ["Project name", "projectName"],
    ["Weekly", "weekly"],
    ["Monthly", "monthly"],
    ["Yearly", "yearly"],
    ["YoY Week", "yoyWeek"],
    ["YoY Month", "yoyMonth"],
    ["Vibe Coding Era", "vibeCodingEra"],
    ["Break Drop", "breakDrop"],
  ] as const)("clicking %s requests sort by %s", async (name, column) => {
    const onSort = vi.fn();
    const { user } = renderTable({ onSort });

    await user.click(header(name));

    expect(onSort).toHaveBeenCalledWith(column);
  });

  it("requests sort with Enter and Space but ignores other keys", async () => {
    const onSort = vi.fn();
    const { user } = renderTable({ onSort });

    header("Yearly").focus();
    await user.keyboard("{Enter}");
    await user.keyboard(" ");
    fireEvent.keyDown(header("Yearly"), { key: "a" });

    expect(onSort).toHaveBeenCalledTimes(2);
    expect(onSort).toHaveBeenNthCalledWith(1, "yearly");
    expect(onSort).toHaveBeenNthCalledWith(2, "yearly");
  });

  it("renders dashes for missing changes", () => {
    mockMatrix([
      buildRow("empty", 0, {
        weeklyChange: null,
        monthlyChange: null,
        yearlyChange: null,
        yoyWeekChange: null,
        yoyMonthChange: null,
        vibeCodingEraChange: null,
        breakDropIndicator: {
          christmasDropPercentage: null,
          weekendDropPercentage: 0,
          corporateUsageScore: null,
          corporateUsageLevel: null,
          hasEnoughData: false,
        },
      }),
    ]);
    renderTable();

    const [row] = screen.getAllByRole("row").slice(1);
    if (!row) throw new Error("Missing row");
    const cells = within(row).getAllByRole("cell");
    expect(cells[0]).toHaveTextContent("empty");
    cells.slice(1, 7).forEach((cell) => expect(cell).toHaveTextContent(/^-+$/));
    expect(cells[7]).toHaveTextContent("Insufficient data");
  });

  it("renders no rows when the matrix is empty", () => {
    mockMatrix([], EMPTY_DATES);
    renderTable();

    expect(screen.getAllByRole("row")).toHaveLength(1);
  });

  it("shows the weekly period with the default formatter", async () => {
    const { user } = renderTable();

    const tooltip = await hoverHeaderInfo(user, "Weekly");

    expect(tooltip).toHaveTextContent("Weekly Downloads Change");
    expect(tooltip).toHaveTextContent(
      "Recent Full Week2024-03-18 – 2024-03-24",
    );
    expect(tooltip).toHaveTextContent(
      "Previous Full Week2024-03-11 – 2024-03-17",
    );
  });

  it("formats single-month periods by month name", async () => {
    const { user } = renderTable();

    const tooltip = await hoverHeaderInfo(user, "Monthly");

    expect(tooltip).toHaveTextContent("Monthly Downloads Change");
    expect(tooltip).toHaveTextContent("Recent Full MonthMarch 2024");
    expect(tooltip).toHaveTextContent("Previous Full MonthFebruary 2024");
  });

  it("formats month periods spanning two months as a range", async () => {
    const { user } = renderTable();

    const tooltip = await hoverHeaderInfo(user, "YoY Month");

    expect(tooltip).toHaveTextContent("Year-over-Year Monthly Change");
    expect(tooltip).toHaveTextContent(
      "Last Year's Full Month2023-02 – 2023-03",
    );
  });

  it("formats yearly periods as a single year", async () => {
    const { user } = renderTable();

    const tooltip = await hoverHeaderInfo(user, "Yearly");

    expect(tooltip).toHaveTextContent("Recent Full Year2023");
    expect(tooltip).toHaveTextContent("Previous Full Year2022");
  });

  it("formats yearly periods spanning two years as a range", async () => {
    mockMatrix([...ROWS], SPLIT_YEAR_DATES);
    const { user } = renderTable();

    const tooltip = await hoverHeaderInfo(user, "Yearly");

    expect(tooltip).toHaveTextContent("Recent Full Year2022 – 2023");
  });

  it("shows the YoY week tooltip", async () => {
    const { user } = renderTable();

    const yoyWeek = await hoverHeaderInfo(user, "YoY Week");

    expect(yoyWeek).toHaveTextContent("Year-over-Year Weekly Change");
    expect(yoyWeek).toHaveTextContent(
      "Last Year's Full Week2023-03-18 – 2023-03-24",
    );
  });

  it("shows the vibe coding era tooltip with its description", async () => {
    const { user } = renderTable();

    const vibe = await hoverHeaderInfo(user, "Vibe Coding Era");
    expect(vibe).toHaveTextContent("Vibe Coding Era Change");
    expect(vibe).toHaveTextContent("Vibe Coding Era Start Week2024-10-07");
    expect(vibe).toHaveTextContent(
      "began when tools like Bolt, Lovable, and others were released",
    );
  });

  it("explains the break drop indicator", async () => {
    const { user } = renderTable();

    const tooltip = await hoverHeaderInfo(user, "Break Drop");

    expect(tooltip).toHaveTextContent("Break Drop Indicator");
    expect(tooltip).toHaveTextContent("Use as a general indicator only.");
  });

  it("renders an empty tooltip when period dates are missing", async () => {
    mockMatrix([...ROWS], EMPTY_DATES);
    const { user } = renderTable();

    const tooltip = await hoverHeaderInfo(user, "Weekly");

    expect(tooltip).toBeEmptyDOMElement();
  });
});

describe("ProjectNameCell", () => {
  const renderCell = (isLoading?: boolean) =>
    renderWithProviders(
      <table>
        <tbody>
          <tr>
            <ProjectNameCell
              projectName="react"
              index={0}
              isLoading={isLoading}
            />
          </tr>
        </tbody>
      </table>,
    );

  it("shows the project name with a dot indicator", () => {
    renderCell();

    expect(screen.getByRole("cell")).toHaveTextContent("react");
  });

  it("shows a skeleton while loading", () => {
    renderCell(true);

    const cell = screen.getByRole("cell");
    expect(cell).not.toHaveTextContent("react");
    expect(cell.querySelector(".animate-pulse")).not.toBeNull();
  });
});
