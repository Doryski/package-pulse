import { expect, Locator, Page } from "@playwright/test";

const buildMockDownloads = (
  start: string,
  end: string,
  packageName: string,
) => {
  const downloads: Array<{ day: string; downloads: number }> = [];
  const startDate = new Date(start);
  const endDate = new Date(end);
  for (
    let day = new Date(startDate);
    day <= endDate;
    day.setUTCDate(day.getUTCDate() + 1)
  ) {
    downloads.push({
      day: day.toISOString().slice(0, 10),
      downloads: 100_000 + Math.floor(Math.random() * 50_000),
    });
  }
  return { downloads, start, end, package: packageName };
};

const buildMockPackageInfo = (projectName: string) => ({
  name: projectName,
  "dist-tags": { latest: "1.0.0" },
  versions: {
    "1.0.0": {
      _id: `${projectName}@1.0.0`,
      name: projectName,
      version: "1.0.0",
    },
  },
  time: {
    created: "2020-01-01T00:00:00.000Z",
    modified: "2024-12-01T00:00:00.000Z",
    "1.0.0": "2020-01-01T00:00:00.000Z",
  },
  description: `Mock package ${projectName}`,
  homepage: `https://example.com/${projectName}`,
  license: "MIT",
  keywords: ["mock", projectName],
  repository: { type: "git", url: `https://github.com/mock/${projectName}` },
});

export const mockExternalApis = async (page: Page) => {
  await page.route(
    /https:\/\/api\.npmjs\.org\/downloads\/range\/.+/,
    async (route) => {
      const url = route.request().url();
      const match = url.match(/range\/([^:]+):([^/]+)\/([^?]+)/);
      if (!match) return route.fulfill({ status: 404 });
      const [, start, end, pkg] = match;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(
          buildMockDownloads(start!, end!, decodeURIComponent(pkg!)),
        ),
      });
    },
  );

  await page.route("**/registry.npmjs.org/**", async (route) => {
    const url = route.request().url();
    // Pass through registry search endpoint (used by combobox tests).
    if (url.includes("/-/")) return route.fallback();
    const pkg = decodeURIComponent(
      url.split("registry.npmjs.org/")[1]!.split("?")[0]!,
    );
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(buildMockPackageInfo(pkg)),
    });
  });

  await page.route(/https:\/\/api\.github\.com\/.*/, async (route) => {
    await route.fulfill({ status: 404, body: "{}" });
  });
};

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
  await mockExternalApis(page);
  await page.goto(`/?projects=${projects.join(",")}`);
};
