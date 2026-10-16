import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";

const getThemeToggleGroup = (page: Page) => page.getByLabel(/Theme/);

const selectTheme = (page: Page, theme: string) =>
  getThemeToggleGroup(page).getByLabel(theme).click();

const expectHtmlClass = (page: Page, themeClass: string) =>
  expect(page.locator("html")).toHaveAttribute("class", themeClass);

test.describe("Theme Switch", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("should have default theme set to system", async ({ page }) => {
    await expect(
      getThemeToggleGroup(page).getByLabel("System"),
    ).toHaveAttribute("data-state", "on");
  });

  test("should change theme to dark when selected", async ({ page }) => {
    await selectTheme(page, "Dark");
    await expectHtmlClass(page, "dark");
  });

  test("should change theme to light when selected", async ({ page }) => {
    await selectTheme(page, "Light");
    await expectHtmlClass(page, "light");
  });

  test("should persist theme selection across page reloads", async ({
    page,
  }) => {
    await selectTheme(page, "Dark");
    await page.reload();
    await expectHtmlClass(page, "dark");
  });

  test("should persist theme selection across navigation", async ({ page }) => {
    await selectTheme(page, "Dark");
    await expectHtmlClass(page, "dark");

    await page.goto("/compare/react-vs-vue");

    await expectHtmlClass(page, "dark");
    await expect(getThemeToggleGroup(page).getByLabel("Dark")).toHaveAttribute(
      "data-state",
      "on",
    );
  });
});
