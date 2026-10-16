import * as fs from "node:fs/promises";
import type { Locator, Page } from "@playwright/test";
import { projectNames } from "./data";
import { expect, test } from "./fixtures";
import { goToProjectsPage } from "./utils";

const PROJECT_NAME_COLUMN_INDEX = 0;
const PERCENTAGE_COLUMN_INDICES = [1, 2, 3, 4, 5, 6];
const BREAK_DROP_COLUMN_INDEX = 7;

const CHRISTMAS_WEIGHT = 1;
const WEEKEND_WEIGHT = 1.5;

const getHeader = (page: Page, columnName: string) =>
  page.locator(`th[data-column-name="${columnName}"]`);

const readDownload = async (page: Page, buttonName: "CSV" | "JSON") => {
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: buttonName, exact: true }).click();
  const download = await downloadPromise;
  const path = await download.path();
  return {
    filename: download.suggestedFilename(),
    content: await fs.readFile(path, "utf8"),
  };
};

const parseCsvProjectNames = (content: string) =>
  content
    .split(/\r?\n/)
    .slice(1)
    .filter(Boolean)
    .map((line) => line.split(",")[0]!.replace(/^"|"$/g, ""));

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

test.describe("Table export", () => {
  test.beforeEach(async ({ page }) => {
    await goToProjectsPage(page, projectNames);
    await assertTableContainsProjects(page, projectNames);
  });

  test("JSON export matches the visible table order @responsive", async ({
    page,
  }) => {
    await expect(
      page.getByRole("button", { name: "CSV", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "JSON", exact: true }),
    ).toBeVisible();

    const { filename, content } = await readDownload(page, "JSON");

    expect(filename).toMatch(/^package-pulse-\d+\.json$/);
    const rows: Array<{ projectName: string }> = JSON.parse(content);
    expect(rows.map((row) => row.projectName)).toEqual(
      await getProjectNameColumnValues(page),
    );
    expect([...rows.map((row) => row.projectName)].sort()).toEqual(
      [...projectNames].sort(),
    );
  });

  test("CSV export matches the visible table order", async ({ page }) => {
    const { filename, content } = await readDownload(page, "CSV");

    expect(filename).toMatch(/^package-pulse-\d+\.csv$/);
    expect(content.split(/\r?\n/)[0]).toContain("projectName");
    expect(parseCsvProjectNames(content)).toEqual(
      await getProjectNameColumnValues(page),
    );
  });

  test("exports follow the current sort order", async ({ page }) => {
    await sortByColumn(page, "projectName");
    await expect(getHeader(page, "projectName")).toHaveAttribute(
      "aria-sort",
      "descending",
    );
    const descending = await getProjectNameColumnValues(page);
    expect((await readDownload(page, "JSON")).content).toBeTruthy();
    expect(
      parseCsvProjectNames((await readDownload(page, "CSV")).content),
    ).toEqual(descending);

    await sortByColumn(page, "projectName");
    await expect(getHeader(page, "projectName")).toHaveAttribute(
      "aria-sort",
      "ascending",
    );
    const ascending = await getProjectNameColumnValues(page);
    expect(ascending).toEqual([...descending].reverse());
    const { content } = await readDownload(page, "JSON");
    const rows: Array<{ projectName: string }> = JSON.parse(content);
    expect(rows.map((row) => row.projectName)).toEqual(ascending);
  });
});

test.describe("Table info view", () => {
  test.beforeEach(async ({ page }) => {
    await goToProjectsPage(page, projectNames);
    await assertTableContainsProjects(page, projectNames);
  });

  test("info toggle shows info table with package links", async ({ page }) => {
    await page.getByRole("radio", { name: "Toggle info" }).click();

    await expect(
      page.getByRole("columnheader", { name: "Latest Version" }),
    ).toBeVisible();
    await expect(page.locator("table[data-sort-direction]")).toBeHidden();

    for (const name of projectNames) {
      await expect(
        page.getByRole("link", { name: `${name} on npm` }),
      ).toHaveAttribute("href", `https://www.npmjs.com/package/${name}`);
      await expect(
        page.getByRole("link", { name: `${name} homepage` }),
      ).toHaveAttribute("href", /^https:\/\/example\.com\//);
      await expect(
        page.getByRole("link", { name: `${name} GitHub repository` }),
      ).toHaveAttribute("href", /^https:\/\/github\.com\//);
    }

    await page.getByRole("radio", { name: "Toggle stats" }).click();
    await expect(page.locator("table[data-sort-direction]")).toBeVisible();
  });
});

test.describe("Table keyboard and persistence", () => {
  test.beforeEach(async ({ page }) => {
    await goToProjectsPage(page, projectNames);
    await assertTableContainsProjects(page, projectNames);
  });

  test("Enter and Space on a focused header change the sort", async ({
    page,
  }) => {
    const header = getHeader(page, "weekly");
    await expect(header).toHaveAttribute("aria-sort", "none");

    await header.focus();
    await page.keyboard.press("Enter");
    await expect(header).toHaveAttribute("aria-sort", "descending");
    await expect(page.locator("table")).toHaveAttribute(
      "data-sort-direction",
      "desc",
    );

    await page.keyboard.press("Space");
    await expect(header).toHaveAttribute("aria-sort", "ascending");
    await expect(page.locator("table")).toHaveAttribute(
      "data-sort-direction",
      "asc",
    );
    assertSortedPercentages(await getPercentageColumnValues(page, 1), "asc");
  });

  test("sort persists after reload", async ({ page }) => {
    const header = getHeader(page, "monthly");
    await header.click();
    await header.click();
    await expect(header).toHaveAttribute("aria-sort", "ascending");

    await page.reload();
    await assertTableContainsProjects(page, projectNames);

    await expect(getHeader(page, "monthly")).toHaveAttribute(
      "aria-sort",
      "ascending",
    );
    await expect(page.locator("table")).toHaveAttribute(
      "data-sort-column",
      "monthly",
    );
    assertSortedPercentages(await getPercentageColumnValues(page, 2), "asc");
  });
});
