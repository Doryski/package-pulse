import { expect, Locator, Page, test } from "@playwright/test";
import { projectNames } from "./data";
import { goToProjectsPage } from "./utils";

const PROJECT_NAME_COLUMN_INDEX = 0;
const PERCENTAGE_COLUMN_INDICES = [1, 2, 3, 4, 5, 6];
const BREAK_DROP_COLUMN_INDEX = 7;

const CHRISTMAS_WEIGHT = 1;
const WEEKEND_WEIGHT = 1.5;

const waitForTableLoaded = async (page: Page) => {
  await page.waitForSelector("table tbody tr");
};

const assertTableContainsProjects = async (page: Page, projects: string[]) => {
  await waitForTableLoaded(page);
  for (const project of projects) {
    await expect(page.locator("table")).toContainText(project);
  }
};

const getColumnCells = (page: Page, columnIndex: number) =>
  page.locator(`table tbody tr td:nth-child(${columnIndex + 1})`);

const getSortDirection = (page: Page) =>
  page.locator("table").getAttribute("data-sort-direction");

const sortByColumn = (page: Page, columnName: string) =>
  page.locator(`[data-column-name="${columnName}"]`).click();

const getPercentageColumnValues = (page: Page, columnIndex: number) =>
  getColumnCells(page, columnIndex)
    .locator('[data-value-type="percentage"]')
    .allTextContents();

const getProjectNameColumnValues = async (page: Page) => {
  const values = await getColumnCells(page, PROJECT_NAME_COLUMN_INDEX)
    .locator("span")
    .filter({ hasText: /\S/ })
    .allTextContents();
  return values.map((value) => value.trim());
};

const parsePercentage = (text: string | null) => {
  const match = text?.match(/(-?\d+(?:\.\d+)?)\s*%/);
  return match ? parseFloat(match[1]!) : null;
};

const getBreakDropScore = async (cell: Locator) => {
  const weekend = parsePercentage(
    await cell
      .getByText(/Weekend:/)
      .textContent()
      .catch(() => null),
  );
  if (weekend === null) {
    return 0;
  }
  const christmasLocator = cell.getByText(/Christmas:/);
  const christmas = (await christmasLocator.count())
    ? parsePercentage(await christmasLocator.textContent())
    : null;
  if (christmas === null) {
    return 0;
  }
  return (
    (christmas * CHRISTMAS_WEIGHT + weekend * WEEKEND_WEIGHT) /
    (CHRISTMAS_WEIGHT + WEEKEND_WEIGHT)
  );
};

const getBreakDropColumnValues = async (page: Page) => {
  const cells = await getColumnCells(page, BREAK_DROP_COLUMN_INDEX).all();
  return Promise.all(cells.map(getBreakDropScore));
};

const assertSortedNumbers = (values: number[], sortDirection: string) => {
  expect(values.length).toBeGreaterThan(0);
  const sortedValues = values.toSorted((a, b) =>
    sortDirection === "asc" ? a - b : b - a,
  );
  expect(values).toEqual(sortedValues);
};

const assertSortedPercentages = (values: string[], sortDirection: string) => {
  expect(values.length).toBeGreaterThan(0);
  assertSortedNumbers(
    values.map((value) => parseFloat(value)),
    sortDirection,
  );
};

const assertSortedStrings = (values: string[], sortDirection: string) => {
  expect(values.length).toBeGreaterThan(0);
  const sortedValues = values.toSorted((a, b) =>
    sortDirection === "asc" ? a.localeCompare(b) : b.localeCompare(a),
  );
  expect(values).toEqual(sortedValues);
};

test.describe("Table Section", () => {
  test.beforeEach(async ({ page }) => {
    await goToProjectsPage(page, projectNames);
  });

  test("table contains all project names", async ({ page }) => {
    await page.waitForSelector("table");
    await expect(page.locator("table")).toBeVisible();
    await assertTableContainsProjects(page, projectNames);
  });

  test("table is hidden when no data", async ({ page }) => {
    await goToProjectsPage(page, []);
    await expect(page.locator("table")).toBeHidden();
  });
});

test.describe("Table Sorting", () => {
  test.beforeEach(async ({ page }) => {
    await goToProjectsPage(page, projectNames);
    await assertTableContainsProjects(page, projectNames);
  });

  test("sort by project name ascending and descending", async ({ page }) => {
    await sortByColumn(page, "projectName");
    let sortDirection = await getSortDirection(page);
    assertSortedStrings(await getProjectNameColumnValues(page), sortDirection!);

    await sortByColumn(page, "projectName");
    sortDirection = await getSortDirection(page);
    assertSortedStrings(await getProjectNameColumnValues(page), sortDirection!);
  });

  test("sort percentage columns ascending and descending", async ({ page }) => {
    const columnNames = [
      "weekly",
      "monthly",
      "yearly",
      "yoyWeek",
      "yoyMonth",
      "vibeCodingEra",
    ];

    for (let i = 0; i < columnNames.length; i++) {
      const columnName = columnNames[i]!;
      const columnIndex = PERCENTAGE_COLUMN_INDICES[i]!;

      await sortByColumn(page, columnName);
      let sortDirection = await getSortDirection(page);
      assertSortedPercentages(
        await getPercentageColumnValues(page, columnIndex),
        sortDirection!,
      );

      await sortByColumn(page, columnName);
      sortDirection = await getSortDirection(page);
      assertSortedPercentages(
        await getPercentageColumnValues(page, columnIndex),
        sortDirection!,
      );
    }
  });

  test("sort by break drop ascending and descending", async ({ page }) => {
    await sortByColumn(page, "breakDrop");
    let sortDirection = await getSortDirection(page);
    assertSortedNumbers(await getBreakDropColumnValues(page), sortDirection!);

    await sortByColumn(page, "breakDrop");
    sortDirection = await getSortDirection(page);
    assertSortedNumbers(await getBreakDropColumnValues(page), sortDirection!);
  });
});
