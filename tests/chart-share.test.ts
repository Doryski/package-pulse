import type { Download, Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { projectNames } from "./data";
import { expect, test } from "./fixtures";
import { getChartLoader, goToProjectsPage } from "./utils";

const CHART_FILE_PATTERN = (extension: string) =>
  new RegExp(`^package-pulse-chart-\\d+\\.${extension}$`);

const SHARE_TO_X_URL = "https://twitter.com/intent/tweet";

const CHART_LOAD_TIMEOUT = 30_000;
const IMAGE_RENDER_TIMEOUT = 20_000;

const getMainChart = (page: Page) => page.getByTestId("main-chart");

const waitForChart = async (page: Page) => {
  await expect(getMainChart(page).locator(".recharts-wrapper")).toBeVisible({
    timeout: CHART_LOAD_TIMEOUT,
  });
  await expect(
    getMainChart(page)
      .locator(
        ".recharts-xAxis-tick-labels .recharts-cartesian-axis-tick-value",
      )
      .first(),
  ).toBeVisible();
  await expect(getChartLoader(page)).toBeHidden();
};

const openShareMenu = async (page: Page) => {
  await getMainChart(page).getByRole("button", { name: "Share" }).click();
  await expect(page.getByRole("menu")).toBeVisible();
};

const clickShareItem = async (page: Page, name: string) => {
  await openShareMenu(page);
  await page.getByRole("menuitem", { name }).click();
};

const getToast = (page: Page, text: string) =>
  page.locator("[data-sonner-toast]").filter({ hasText: text });

const readDownload = async (download: Download) =>
  readFile(await download.path(), "utf-8");

const readClipboardText = (page: Page) =>
  page.evaluate(() => navigator.clipboard.readText());

const readClipboardTypes = (page: Page) =>
  page.evaluate(async () => {
    const items = await navigator.clipboard.read();
    return items.flatMap((item) => [...item.types]);
  });

test.describe("Chart share", () => {
  test.beforeEach(async ({ page }) => {
    await goToProjectsPage(page, projectNames);
    await waitForChart(page);
  });

  test("downloads the chart as PNG", async ({ page }) => {
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Download chart as PNG" }).click();

    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(CHART_FILE_PATTERN("png"));
    await expect(getToast(page, "Chart downloaded as image")).toBeVisible({
      timeout: IMAGE_RENDER_TIMEOUT,
    });
  });

  test("exports chart data as CSV @responsive", async ({ page }) => {
    const downloadPromise = page.waitForEvent("download");
    await clickShareItem(page, "Export CSV");

    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(CHART_FILE_PATTERN("csv"));

    const [header = "", ...rows] = (await readDownload(download))
      .trim()
      .split(/\r?\n/);
    expect(header.split(",")).toEqual(["time", ...projectNames]);
    expect(rows.length).toBeGreaterThan(0);
    expect(rows[0]).toMatch(/^\d{4}-\d{2}-\d{2},/);
  });

  test("shares to X in a new window @responsive", async ({ page }) => {
    const popupPromise = page.waitForEvent("popup");
    await clickShareItem(page, "Share to X");

    const popup = await popupPromise;
    await popup.waitForURL((url) => url.href.startsWith(SHARE_TO_X_URL));
    const popupUrl = new URL(popup.url());
    expect(popupUrl.searchParams.get("url")).toBe(page.url());
    expect(popup.url()).toContain(encodeURIComponent(page.url()));
  });

  test.describe("clipboard", () => {
    test.use({ permissions: ["clipboard-read", "clipboard-write"] });

    test("copies the page link @responsive", async ({ page }) => {
      await clickShareItem(page, "Copy link");

      await expect(getToast(page, "Link copied to clipboard")).toBeVisible();
      expect(await readClipboardText(page)).toBe(page.url());
    });

    test("copies the chart image", async ({ page }) => {
      await clickShareItem(page, "Copy image");

      await expect(getToast(page, "Chart copied to clipboard")).toBeVisible({
        timeout: IMAGE_RENDER_TIMEOUT,
      });
      expect(await readClipboardTypes(page)).toContain("image/png");
    });
  });
});
