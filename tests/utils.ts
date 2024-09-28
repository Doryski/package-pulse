import { expect, Locator, Page } from "@playwright/test";

export const getSearchInput = (page: Page) =>
  page.getByPlaceholder("Search project...");

export const fillSearchInput = async (
  searchInput: Locator,
  projectName: string,
) => {
  await searchInput.focus();
  await searchInput.click();
  await searchInput.fill(projectName);
};

export const getOptionsList = (page: Page) =>
  page.getByRole("dialog").getByRole("listbox");

export const getTags = (page: Page) =>
  page.getByRole("list").getByRole("listitem");

export const waitForSearchResponse = async (
  page: Page,
  projectName: string,
) => {
  await page.waitForResponse((response) =>
    response
      .url()
      .includes(`registry.npmjs.org/-/v1/search?text=${projectName}`),
  );
};

export const addManyProjects = async (
  page: Page,
  searchInput: Locator,
  projectNames: string[],
) => {
  for (const projectName of projectNames) {
    await fillSearchInput(searchInput, projectName);
    await waitForSearchResponse(page, projectName);
    const list = getOptionsList(page);
    if (!(await list.isVisible())) {
      await searchInput.click();
    }
    await expect(list).toBeVisible();
    const firstOption = list.getByRole("option").first();
    await expect(firstOption).toBeVisible();
    await firstOption.click();
    await expect(searchInput).toHaveValue("");
    await expect(getTags(page).getByText(projectName)).toBeVisible();
    await page.waitForURL(
      (url) => url.searchParams.get("projects")?.includes(projectName) ?? false,
    );
  }
};

export const goToProjectsPage = async (page: Page, projects: string[]) => {
  await page.goto(`/?projects=${projects.join(",")}`);
};
