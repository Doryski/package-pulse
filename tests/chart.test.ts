import timePeriods from "@/lib/enums/TimePeriod";
import { expect, Page, test } from "@playwright/test";
import { projectNames } from "./data";
import { goToProjectsPage } from "./utils";

const checkLegendContent = async (page: Page) => {
  for (const project of projectNames) {
    await expect(page.locator(".recharts-legend-wrapper")).toContainText(
      project,
    );
  }
};

test.describe("Chart Section", () => {
  test.beforeEach(async ({ page }) => {
    await goToProjectsPage(page, projectNames);
  });

  test("chart is visible", async ({ page }) => {
    await page.waitForSelector(".recharts-wrapper");
    await expect(page.locator(".recharts-wrapper")).toBeVisible();
  });

  test("chart legend contains all project names", async ({ page }) => {
    await page.waitForSelector(".recharts-wrapper");
    await checkLegendContent(page);
  });

  test("changing time period updates chart", async ({ page }) => {
    await page.waitForSelector(".recharts-wrapper");
    await page.waitForSelector(".recharts-cartesian-axis-tick-value");

    const initialXAxisLabels = await page
      .locator(".recharts-xAxis .recharts-cartesian-axis-tick-value")
      .allTextContents();

    await expect(page.locator("#time-period-select")).toBeVisible();
    await page.click("#time-period-select");
    const oneMonthTimePeriod = timePeriods.find(
      (timePeriod) => timePeriod.value === "months-1",
    )!;
    const oneMonthOption = page.getByText(oneMonthTimePeriod?.label);
    await oneMonthOption.click();

    const loader = page.locator("[role='status']");
    await expect(loader).not.toBeVisible();

    const updatedXAxisLabels = await page
      .locator(".recharts-xAxis .recharts-cartesian-axis-tick-value")
      .allTextContents();

    expect(updatedXAxisLabels).not.toEqual(initialXAxisLabels);
    expect(updatedXAxisLabels.length).toBeLessThan(initialXAxisLabels.length);
  });

  test("tooltip appears on hover", async ({ page }) => {
    await page.waitForSelector(".recharts-wrapper");
    const chartArea = page.locator(".recharts-wrapper");
    await chartArea.hover({ position: { x: 100, y: 100 } });

    await expect(page.locator(".recharts-tooltip-wrapper")).toBeVisible();
  });

  test("tooltip contains project names", async ({ page }) => {
    await page.waitForSelector(".recharts-wrapper");
    const chartArea = page.locator(".recharts-wrapper");
    await chartArea.hover({ position: { x: 100, y: 100 } });

    const tooltip = page.locator(".recharts-tooltip-wrapper");
    await expect(tooltip).toBeVisible();

    for (const project of projectNames) {
      await expect(tooltip).toContainText(project);
    }
  });
});
