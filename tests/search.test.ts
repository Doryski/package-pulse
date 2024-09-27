import { expect, test } from "@playwright/test";
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
    const searchInput = getSearchInput(page);
    const projectName = "react";

    await fillSearchInput(searchInput, projectName);
    await waitForSearchResponse(page, projectName);

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
    const searchInput = getSearchInput(page);
    const projectName = "react";

    await fillSearchInput(searchInput, projectName);
    await waitForSearchResponse(page, projectName);

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
    const localStorageProjects = await page.evaluate(() => {
      return localStorage.getItem("selected-projects");
    });
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
});
