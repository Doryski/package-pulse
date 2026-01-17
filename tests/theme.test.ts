import { expect, Page, test } from "@playwright/test";

const getThemeToggleGroup = (page: Page) => page.getByLabel(/Theme/);

const selectTheme = async (page: Page, theme: string) => {
  const themeToggle = getThemeToggleGroup(page);
  await themeToggle.getByLabel(theme).click();
};

test.describe("Theme Switch", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("should have default theme set to system", async ({ page }) => {
    const systemButton = getThemeToggleGroup(page).getByLabel("System");
    await expect(systemButton).toHaveAttribute("data-state", "on");
  });

  test("should change theme to dark when selected", async ({ page }) => {
    await selectTheme(page, "Dark");
    await expect(page.locator("html")).toHaveAttribute("class", "dark");
  });

  test("should change theme to light when selected", async ({ page }) => {
    await selectTheme(page, "Light");
    await expect(page.locator("html")).toHaveAttribute("class", "light");
  });

  test("should persist theme selection across page reloads", async ({
    page,
  }) => {
    await selectTheme(page, "Dark");
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("class", "dark");
  });
});
