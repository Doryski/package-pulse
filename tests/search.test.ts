import { expect, Page, test } from "@playwright/test";
import { projectNames, projectNamesLimit } from "./data";
import {
  addManyProjects,
  fillSearchInput,
  getOptionsList,
  getSearchInput,
  getTags,
  goToProjectsPage,
  waitForSearchResponse,
} from "./utils";

const prepareFilledCombobox = async (page: Page, projectName: string) => {
  const searchInput = getSearchInput(page);

  await fillSearchInput(searchInput, projectName);
  await waitForSearchResponse(page, projectName);

  return searchInput;
};

test.describe("Search Projects Form", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test.afterEach(async ({ page }) => {
    await page.evaluate(() => {
      localStorage.removeItem("selected-projects");
    });
  });

  test("should allow searching for and selecting projects", async ({
    page,
  }) => {
    const projectName = "react";
    const searchInput = await prepareFilledCombobox(page, projectName);

    const list = getOptionsList(page);
    await expect(list).toBeVisible();

    const searchResults = list.getByRole("option");
    await expect(searchResults.first()).toBeVisible();

    const firstOption = searchResults.first();
    await firstOption.click();

    const selectedProject = getTags(page).getByText(projectName);
    await expect(selectedProject).toBeVisible();

    await expect(searchInput).toHaveValue("");
  });

  test("should allow removing selected projects", async ({ page }) => {
    const projectName = "react";
    await prepareFilledCombobox(page, projectName);

    const list = getOptionsList(page);
    const firstOption = list.getByRole("option").first();
    await firstOption.click();

    const selectedProject = getTags(page).getByText(projectName);
    await expect(selectedProject).toBeVisible();

    const removeButton = selectedProject.locator("button");
    await removeButton.click();

    await expect(selectedProject).not.toBeVisible();
  });

  test("should update URL with selected projects", async ({ page }) => {
    const searchInput = getSearchInput(page);
    const projectNames = ["react", "vue"];

    await addManyProjects(page, searchInput, projectNames);

    const url = page.url();
    expect(url).toContain("projects=react,vue");
  });

  test("should load projects from URL and show the tags", async ({ page }) => {
    await goToProjectsPage(page, projectNames);
    await page.waitForSelector("[role='list']");
    const tags = getTags(page);
    for (const projectName of projectNames) {
      expect(tags.getByText(projectName)).toBeVisible();
    }
  });

  test("should load empty projects list if the projects URL param is empty", async ({
    page,
  }) => {
    await page.evaluate((projects) => {
      localStorage.setItem("selected-projects", JSON.stringify(projects));
    }, projectNames);

    await goToProjectsPage(page, []);
    await fillSearchInput(getSearchInput(page), "");
    const localStorageProjects = await page.evaluate(() =>
      localStorage.getItem("selected-projects"),
    );
    expect(localStorageProjects).toEqual(JSON.stringify([]));
    const tagsEmpty = getTags(page);
    expect(await tagsEmpty.all()).toHaveLength(0);
  });

  test("should show error for non-existent project", async ({ page }) => {
    const searchInput = getSearchInput(page);
    const nonExistentProject = "this-project-does-not-exist-12345";

    await fillSearchInput(searchInput, nonExistentProject);
    await searchInput.press("Enter");

    const errorMessage = page.getByText(
      `Project "${nonExistentProject}" not found`,
    );
    await expect(errorMessage).toBeVisible();
  });

  test("should show project on submit", async ({ page }) => {
    const searchInput = getSearchInput(page);
    const projectName = "react";

    await fillSearchInput(searchInput, projectName);
    await searchInput.press("Enter");

    const selectedProject = getTags(page).getByText(projectName);
    await expect(selectedProject).toBeVisible();

    await expect(searchInput).toHaveValue("");
  });

  test("should limit the number of selected projects", async ({ page }) => {
    const searchInput = getSearchInput(page);

    await goToProjectsPage(page, projectNamesLimit);

    const limitMessage = page.getByText(
      "You cannot select more than 10 projects",
    );
    await expect(limitMessage).toBeVisible();

    await expect(searchInput).toBeDisabled();
  });

  test("should navigate through the options with the arrow keys", async ({
    page,
  }) => {
    const searchInput = await prepareFilledCombobox(page, "react");

    const list = getOptionsList(page);
    await expect(list).toBeVisible();

    const searchResults = list.getByRole("option");
    await expect(searchResults.first()).toBeVisible();

    const searchResultsElements = await searchResults.all();

    // Navigate down
    for (let i = 0; i < searchResultsElements.length; i++) {
      await page.keyboard.press("ArrowDown");
      await expect(searchResults.nth(i)).toHaveAttribute(
        "aria-selected",
        "true",
      );
    }

    // Navigate up
    for (let i = searchResultsElements.length - 1; i >= 0; i--) {
      await expect(searchResults.nth(i)).toHaveAttribute(
        "aria-selected",
        "true",
      );
      await page.keyboard.press("ArrowUp");
    }

    // The last ArrowUp should focus the input
    await expect(searchInput).toBeFocused();
  });

  test("should close the options list when the tab key is pressed", async ({
    page,
  }) => {
    await prepareFilledCombobox(page, "react");

    const list = getOptionsList(page);
    await expect(list).toBeVisible();

    await page.keyboard.press("Tab");

    await expect(list).not.toBeVisible();
  });

  test("should search for project when the enter key is pressed", async ({
    page,
  }) => {
    const projectName = "react";
    const searchInput = await prepareFilledCombobox(page, projectName);

    await searchInput.press("Enter");

    const selectedProject = getTags(page).getByText(projectName);
    await expect(selectedProject).toBeVisible();
  });
});
