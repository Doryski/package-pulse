import { expect as baseExpect, type Page } from "@playwright/test";
import { test } from "./fixtures";
import { goToProjectsPage } from "./utils";

const expect = baseExpect.configure({ timeout: 30_000 });

const PROJECTS = ["react", "vue"];
const WIDGET_TITLES = [
  "Stats Cards",
  "Bar Chart",
  "Pie Chart",
  "Trend Indicators",
];

const openWidgets = async (page: Page) => {
  await goToProjectsPage(page, PROJECTS);
  await expect(page.getByRole("heading", { name: "Widgets" })).toBeVisible();
};

const getWidgetCard = (page: Page, title: string) =>
  page
    .locator("div.relative")
    .filter({ has: page.getByText(title, { exact: true }) })
    .filter({ has: page.getByLabel("Download widget as PNG") })
    .last();

declare global {
  interface Window {
    __clipboardWrites: string[][];
  }
}

const recordClipboardWrites = () => {
  window.__clipboardWrites = [];
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: {
      write: async (items: ClipboardItem[]) => {
        window.__clipboardWrites.push(items.flatMap((item) => [...item.types]));
      },
      writeText: async () => {},
    },
  });
};

test.describe("widgets", () => {
  test("renders all four widgets", async ({ page }) => {
    await openWidgets(page);

    for (const title of WIDGET_TITLES) {
      await expect(page.getByText(title, { exact: true })).toBeVisible();
    }
    await expect(page.getByLabel("Download widget as PNG")).toHaveCount(4);
  });

  test("downloads a widget as PNG", async ({ page }) => {
    await openWidgets(page);

    const downloadPromise = page.waitForEvent("download");
    await getWidgetCard(page, "Pie Chart")
      .getByLabel("Download widget as PNG")
      .click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toMatch(/\.png$/);
    await expect(page.getByText("Widget downloaded as image")).toBeVisible();
  });

  test("downloads a single project card from the dropdown", async ({
    page,
  }) => {
    await openWidgets(page);

    await getWidgetCard(page, "Stats Cards")
      .getByLabel("Download a single project card")
      .click();
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("menuitem", { name: "Download vue card" }).click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toContain("vue");
    expect(download.suggestedFilename()).toMatch(/\.png$/);
  });

  test("bar chart toggles between Downloads and Growth", async ({ page }) => {
    await openWidgets(page);

    const bar = getWidgetCard(page, "Bar Chart");
    const downloads = bar.getByRole("radio", { name: "Downloads" });
    const growth = bar.getByRole("radio", { name: "Growth" });

    await expect(growth).toBeChecked();
    await downloads.click();
    await expect(downloads).toBeChecked();
    await expect(growth).not.toBeChecked();
    await growth.click();
    await expect(growth).toBeChecked();
    await expect(downloads).not.toBeChecked();
  });

  test("copies a widget as image", async ({ page }) => {
    await page.addInitScript(recordClipboardWrites);
    await openWidgets(page);

    await getWidgetCard(page, "Bar Chart")
      .getByLabel("Copy widget as image")
      .click();

    await expect(page.getByText("Widget copied to clipboard")).toBeVisible();
    await expect
      .poll(() => page.evaluate(() => window.__clipboardWrites))
      .toEqual([["image/png"]]);
  });
});
