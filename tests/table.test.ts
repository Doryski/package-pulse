import { expect, Page, test } from "@playwright/test";
import { projectNames } from "./data";
import { goToProjectsPage } from "./utils";

const assertTableContainsProjects = async (page: Page, projects: string[]) => {
  for (const project of projects) {
    await expect(page.locator("table")).toContainText(project);
  }
};

const getSortedColumnValues = async (page: Page, columnIndex: number) => {
  return await page
    .locator(
      `table tbody tr td:nth-child(${columnIndex + 1}) [data-value-type="percentage"]`,
    )
    .allTextContents();
};

const assertSortedValues = (values: string[], sortDirection: string) => {
  const sortedValues = values.toSorted((a, b) =>
    sortDirection === "asc"
      ? parseFloat(a) - parseFloat(b)
      : parseFloat(b) - parseFloat(a),
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
  });

  test("sort by project name ascending and descending", async ({ page }) => {
    await assertTableContainsProjects(page, projectNames);

    const columns = await page.locator("[data-column-name]").all();
    const table = page.locator("table");

    for (let i = 0; i < columns.length; i++) {
      const column = columns[i];

      // Ascending sort
      await column?.click();
      let sortDirection = await table.getAttribute("data-sort-direction");
      let sortedColumnValues = await getSortedColumnValues(page, i);
      assertSortedValues(sortedColumnValues, sortDirection!);

      // Descending sort
      await column?.click();
      sortDirection = await table.getAttribute("data-sort-direction");
      sortedColumnValues = await getSortedColumnValues(page, i);
      assertSortedValues(sortedColumnValues, sortDirection!);
    }
  });
});
