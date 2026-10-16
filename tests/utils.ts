import {
  expect,
  type Locator,
  type Page,
  type Response,
} from "@playwright/test";

export const getSearchInput = (page: Page) =>
  page.getByPlaceholder("Search projects...");

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

const isSearchResponseFor = (projectName: string) => (response: Response) => {
  const url = new URL(response.url());
  return (
    url.hostname === "registry.npmjs.org" &&
    url.pathname === "/-/v1/search" &&
    url.searchParams.get("text") === projectName
  );
};

export const waitForSearchResponse = (page: Page, projectName: string) =>
  page.waitForResponse(isSearchResponseFor(projectName));

export const addManyProjects = async (
  page: Page,
  searchInput: Locator,
  projectNames: string[],
) => {
  for (const projectName of projectNames) {
    const searchResponse = waitForSearchResponse(page, projectName);
    await fillSearchInput(searchInput, projectName);
    await searchResponse;
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

export const toProjectsQuery = (projects: string[]) =>
  projects.map(encodeURIComponent).join(",");

export const goToProjectsPage = (page: Page, projects: string[]) =>
  page.goto(`/?projects=${toProjectsQuery(projects)}`);

export const getTagRemoveButton = (page: Page, projectName: string) =>
  page.getByRole("button", { name: `Remove ${projectName}`, exact: true });

export const getChartLoader = (page: Page) =>
  page.getByTestId("main-chart-loader");
