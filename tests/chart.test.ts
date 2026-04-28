import timePeriods from "@/lib/enums/TimePeriod";
import { expect, Page, test } from "@playwright/test";
import { projectNames } from "./data";
import { goToProjectsPage } from "./utils";

const MAIN_CHART_WRAPPER_SELECTOR =
  "[data-testid='main-chart'] .recharts-wrapper";

const mainChart = (page: Page) => page.locator(MAIN_CHART_WRAPPER_SELECTOR);

const waitForMainChart = async (page: Page) => {
  await page.waitForSelector(MAIN_CHART_WRAPPER_SELECTOR);
  await expect(mainChart(page)).toBeVisible();
};

const checkLegendContent = async (page: Page) => {
  const legend = page
    .getByTestId("main-chart")
    .locator(".recharts-legend-wrapper");
  for (const project of projectNames) {
    await expect(legend).toContainText(project);
  }
};

test.describe("Chart Section", () => {
  test.beforeEach(async ({ page }) => {
    await goToProjectsPage(page, projectNames);
  });

  test("chart is visible", async ({ page }) => {
    await waitForMainChart(page);
  });

  test("chart legend contains all project names", async ({ page }) => {
    await waitForMainChart(page);
    await checkLegendContent(page);
  });

  test("changing time period updates chart", async ({ page }) => {
    await waitForMainChart(page);
    await page.waitForSelector(
      "[data-testid='main-chart'] .recharts-cartesian-axis-tick-value",
    );

    const initialXAxisLabels = await page
      .locator(
        "[data-testid='main-chart'] .recharts-xAxis .recharts-cartesian-axis-tick-value",
      )
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
      .locator(
        "[data-testid='main-chart'] .recharts-xAxis .recharts-cartesian-axis-tick-value",
      )
      .allTextContents();

    expect(updatedXAxisLabels).not.toEqual(initialXAxisLabels);
    expect(updatedXAxisLabels.length).toBeLessThan(initialXAxisLabels.length);
  });

  test("tooltip appears on hover", async ({ page }) => {
    await waitForMainChart(page);
    const chartArea = mainChart(page);
    await chartArea.hover({ position: { x: 100, y: 100 } });

    await expect(
      page
        .getByTestId("main-chart")
        .locator(".recharts-tooltip-wrapper")
        .first(),
    ).toBeVisible();
  });

  test("tooltip contains project names", async ({ page }) => {
    await waitForMainChart(page);
    const chartArea = mainChart(page);
    await chartArea.hover({ position: { x: 100, y: 100 } });

    const tooltip = page
      .getByTestId("main-chart")
      .locator(".recharts-tooltip-wrapper")
      .first();
    await expect(tooltip).toBeVisible();

    for (const project of projectNames) {
      await expect(tooltip).toContainText(project);
    }
  });
});
