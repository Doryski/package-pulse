import type { Page, Request } from "@playwright/test";
import { projectNamesLimit } from "./data";
import { expect, test } from "./fixtures";
import {
  fillSearchInput,
  getSearchInput,
  getTags,
  goToProjectsPage,
} from "./utils";

const DOWNLOADS_PATH = "/api/downloads";
const COMPARE_PATH = "/compare/react-vs-vue";
const COMPARED_PROJECTS = ["react", "vue"] as const;
const BUDGETED_HOSTS = [
  "registry.npmjs.org",
  "bundlephobia.com",
  "api.deps.dev",
] as const;
const SAME_ORIGIN_PACKAGE_DATA_PATHS = [
  "/api/package-info",
  "/api/bundle-size",
  "/api/deps-dev",
] as const;
const LOADED_PROJECTS = projectNamesLimit.slice(0, 5);
const ADDED_PROJECT = projectNamesLimit[5]!;

const isDownloadsRequest = (request: Request) =>
  new URL(request.url()).pathname === DOWNLOADS_PATH;

const toRequestedPackages = (request: Request) =>
  new URL(request.url()).searchParams.get("packages");

const toApiVersion = (request: Request) =>
  new URL(request.url()).searchParams.get("v");

const recordDownloadsRequests = (page: Page) => {
  const requests: Request[] = [];
  page.on("request", (request) => {
    if (isDownloadsRequest(request)) requests.push(request);
  });
  return requests;
};

const getTableRows = (page: Page) =>
  page.locator("table[data-sort-direction] tbody tr");

const isInfoTableOnlyPath = (path: string) =>
  /\/api\/(bundle-size|deps-dev)$/.test(path);

const isBudgetedHostRequest = (request: Request) =>
  BUDGETED_HOSTS.some((host) => new URL(request.url()).hostname === host);

const recordRequests = (page: Page) => {
  const requests: Request[] = [];
  page.on("request", (request) => requests.push(request));
  return requests;
};

const toBudgetedHostUrls = (requests: Request[]) =>
  requests.filter(isBudgetedHostRequest).map((request) => request.url());

const toPackageDataPaths = (requests: Request[], origin: string) =>
  requests
    .map((request) => new URL(request.url()))
    .filter((url) =>
      SAME_ORIGIN_PACKAGE_DATA_PATHS.some((path) => url.pathname === path),
    )
    .map(
      (url) =>
        `${url.origin === origin ? "same-origin" : url.origin}:${url.pathname}`,
    );

test.describe("network budget", () => {
  test("adding a 6th package to 5 loaded ones requests only the new package (B7)", async ({
    page,
  }) => {
    const requests = recordDownloadsRequests(page);
    await goToProjectsPage(page, LOADED_PROJECTS);
    await expect(getTableRows(page)).toHaveCount(LOADED_PROJECTS.length, {
      timeout: 30_000,
    });
    expect(requests.map(toApiVersion)).toContain("2");
    requests.length = 0;

    const searchInput = getSearchInput(page);
    await fillSearchInput(searchInput, ADDED_PROJECT);
    await searchInput.press("Enter");
    await expect(getTags(page).getByText(ADDED_PROJECT)).toBeVisible();
    await expect(getTableRows(page)).toHaveCount(LOADED_PROJECTS.length + 1, {
      timeout: 30_000,
    });

    expect(requests.map(toRequestedPackages)).toEqual([ADDED_PROJECT]);
  });

  test("compare page makes no browser requests to npm, bundlephobia or deps.dev (B4)", async ({
    page,
  }) => {
    const requests = recordRequests(page);
    await page.goto(COMPARE_PATH);
    await expect(getTableRows(page)).toHaveCount(COMPARED_PROJECTS.length, {
      timeout: 30_000,
    });

    const origin = new URL(page.url()).origin;
    expect(toBudgetedHostUrls(requests)).toEqual([]);
    expect(
      toPackageDataPaths(requests, origin).filter(isInfoTableOnlyPath),
    ).toEqual([]);

    await page.getByRole("radio", { name: "Toggle info" }).click();
    for (const name of COMPARED_PROJECTS) {
      await expect(
        page.getByRole("link", { name: `${name} on npm` }),
      ).toBeVisible({ timeout: 30_000 });
    }
    await expect(page.locator("table[aria-busy]")).toHaveCount(0);

    expect(toBudgetedHostUrls(requests)).toEqual([]);
    expect(toPackageDataPaths(requests, origin)).toEqual(
      expect.arrayContaining([
        "same-origin:/api/package-info",
        "same-origin:/api/deps-dev",
      ]),
    );
    expect(
      toPackageDataPaths(requests, origin).every((path) =>
        path.startsWith("same-origin:"),
      ),
    ).toBe(true);
  });
});
