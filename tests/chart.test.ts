import { formatDate } from "@/app/(home)/utils/date-utils";
import chartModes from "@/lib/enums/ChartMode";
import chartScales from "@/lib/enums/ChartScale";
import timePeriods, { type TimePeriod } from "@/lib/enums/TimePeriod";
import type { Page } from "@playwright/test";
import { subDays, subMonths, subYears } from "date-fns";
import { projectNames } from "./data";
import { expect, test } from "./fixtures";
import { getChartLoader, goToProjectsPage } from "./utils";

const PERIOD_CUTOFFS = {
  "months-1": (now: Date) => subMonths(now, 1),
  "months-3": (now: Date) => subMonths(now, 3),
  "months-6": (now: Date) => subMonths(now, 6),
  "years-1": (now: Date) => subYears(now, 1),
  "years-2": (now: Date) => subYears(now, 2),
  "years-5": (now: Date) => subYears(now, 5),
} as const satisfies Partial<Record<TimePeriod, (now: Date) => Date>>;

const DEFAULT_PERIOD = "all-time" satisfies TimePeriod;

const CHART_LOAD_TIMEOUT = 30_000;

const getMainChart = (page: Page) => page.getByTestId("main-chart");

const getChartWrapper = (page: Page) =>
  getMainChart(page).locator(".recharts-wrapper");

const getXAxisTicks = (page: Page) =>
  getMainChart(page).locator(
    ".recharts-xAxis-tick-labels .recharts-cartesian-axis-tick-value",
  );

const getYAxisTicks = (page: Page) =>
  getMainChart(page).locator(
    ".recharts-yAxis-tick-labels .recharts-cartesian-axis-tick-value",
  );

const getTimePeriodSelect = (page: Page) =>
  page.getByRole("combobox", { name: "Time period" });

const getLegendToggle = (page: Page, project: string) =>
  getMainChart(page).getByRole("button", {
    name: `Toggle ${project} series`,
    exact: true,
  });

const getRadio = (page: Page, name: string) =>
  page.getByRole("radio", { name, exact: true });

const getTooltip = (page: Page) =>
  getMainChart(page).locator(".recharts-tooltip-wrapper").first();

const labelOf = <T extends { value: string; label: string }>(
  options: readonly T[],
  value: T["value"],
) => options.find((option) => option.value === value)?.label ?? value;

const waitForChart = async (page: Page) => {
  await expect(getChartWrapper(page)).toBeVisible({
    timeout: CHART_LOAD_TIMEOUT,
  });
  await expect(getXAxisTicks(page).first()).toBeVisible();
  await expect(getChartLoader(page)).toBeHidden();
};

const readTicks = (page: Page) => getXAxisTicks(page).allTextContents();

const cutoffLabel = (period: keyof typeof PERIOD_CUTOFFS) =>
  formatDate(subDays(PERIOD_CUTOFFS[period](new Date()), 1));

const hasPeriodParam = (period: TimePeriod) => (url: URL) =>
  period === DEFAULT_PERIOD
    ? !url.searchParams.has("period")
    : url.searchParams.get("period") === period;

const selectTimePeriod = async (page: Page, period: TimePeriod) => {
  await getTimePeriodSelect(page).click();
  await page
    .getByRole("option", { name: labelOf(timePeriods, period), exact: true })
    .click();
  await page.waitForURL(hasPeriodParam(period));
  await expect(getTimePeriodSelect(page)).toHaveText(
    labelOf(timePeriods, period),
  );
  await expect(getChartLoader(page)).toBeHidden();
};

const expectTicksChangedFrom = async (page: Page, previous: string[]) => {
  await expect.poll(() => readTicks(page)).not.toEqual(previous);
  return readTicks(page);
};

const isCutoffPeriod = (
  period: TimePeriod,
): period is keyof typeof PERIOD_CUTOFFS => period in PERIOD_CUTOFFS;

const periodsInSelectionOrder = [
  ...timePeriods.filter(({ value }) => value !== DEFAULT_PERIOD),
  ...timePeriods.filter(({ value }) => value === DEFAULT_PERIOD),
].map(({ value }) => value);

test.describe("Chart Section", () => {
  test.beforeEach(async ({ page }) => {
    await goToProjectsPage(page, projectNames);
    await waitForChart(page);
  });

  test("chart is visible @responsive", async ({ page }) => {
    await expect(getChartWrapper(page)).toBeVisible();
    await expect(getTimePeriodSelect(page)).toHaveText(
      labelOf(timePeriods, DEFAULT_PERIOD),
    );
  });

  test("chart legend contains all project names", async ({ page }) => {
    for (const project of projectNames) {
      await expect(getLegendToggle(page, project)).toBeVisible();
    }
  });

  test("every time period updates the x-axis @responsive", async ({ page }) => {
    let previous = await readTicks(page);

    for (const period of periodsInSelectionOrder) {
      await selectTimePeriod(page, period);
      const ticks = await expectTicksChangedFrom(page, previous);
      const [firstTick = ""] = ticks;

      if (isCutoffPeriod(period)) {
        expect(firstTick >= cutoffLabel(period), period).toBe(true);
      } else {
        expect(firstTick < cutoffLabel("years-5"), period).toBe(true);
      }

      previous = ticks;
    }
  });

  test("scale toggles between linear and logarithmic", async ({ page }) => {
    const [linear, logarithmic] = chartScales;
    const linearRadio = getRadio(page, linear!.label);
    const logRadio = getRadio(page, logarithmic!.label);
    await expect(linearRadio).toHaveAttribute("aria-checked", "true");
    const linearTicks = await getYAxisTicks(page).allTextContents();

    await logRadio.click();
    await page.waitForURL(
      (url) => url.searchParams.get("scale") === logarithmic!.value,
    );
    await expect(logRadio).toHaveAttribute("aria-checked", "true");
    await expect(linearRadio).toHaveAttribute("aria-checked", "false");
    await expect
      .poll(() => getYAxisTicks(page).allTextContents())
      .not.toEqual(linearTicks);

    await linearRadio.click();
    await page.waitForURL((url) => !url.searchParams.has("scale"));
    await expect(linearRadio).toHaveAttribute("aria-checked", "true");
  });

  test("since first release timeline disables the time period select", async ({
    page,
  }) => {
    const calendarLabel = labelOf(chartModes, "absolute");
    const normalizedLabel = labelOf(chartModes, "normalized");
    await expect(getTimePeriodSelect(page)).toBeEnabled();

    await getRadio(page, normalizedLabel).click();
    await page.waitForURL(
      (url) => url.searchParams.get("mode") === "normalized",
    );
    await expect(getRadio(page, normalizedLabel)).toHaveAttribute(
      "aria-checked",
      "true",
    );
    await expect(getTimePeriodSelect(page)).toBeDisabled();
    await expect(getChartLoader(page)).toBeHidden();
    await expect(getXAxisTicks(page).first()).toHaveText(/^wk \d+$/);

    await getRadio(page, calendarLabel).click();
    await page.waitForURL((url) => !url.searchParams.has("mode"));
    await expect(getTimePeriodSelect(page)).toBeEnabled();
    await expect(getXAxisTicks(page).first()).toHaveText(/^\d{4}-\d{2}-\d{2}$/);
  });

  test("legend toggle hides and restores a series", async ({ page }) => {
    const [project = ""] = projectNames;
    const toggle = getLegendToggle(page, project);
    const lines = getMainChart(page).locator(".recharts-line-curve");
    await expect(toggle).toHaveAttribute("aria-pressed", "true");
    await expect(lines).toHaveCount(projectNames.length);

    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-pressed", "false");
    await expect(lines).toHaveCount(projectNames.length - 1);

    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-pressed", "true");
    await expect(lines).toHaveCount(projectNames.length);
  });

  test("tooltip appears on hover with all project names", async ({ page }) => {
    await getChartWrapper(page).hover();

    const tooltip = getTooltip(page);
    await expect(tooltip).toBeVisible();
    for (const project of projectNames) {
      await expect(tooltip).toContainText(project);
    }
  });
});
