import { expect, Page, test } from "@playwright/test";

const getThemeSwitch = (page: Page) => page.getByLabel(/Theme/);

const selectTheme = async (page: Page, theme: string) => {
  const themeSwitch = getThemeSwitch(page);
  await themeSwitch.click();
  const menuitems = page.locator('[role="menuitem"]');
  await expect(menuitems).toHaveCount(3);
  await menuitems.getByText(theme).click();
};

test.describe("Theme Switch", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("should have default theme set to system", async ({ page }) => {
    const themeSwitch = getThemeSwitch(page);
    const text = await themeSwitch.textContent();
    expect(text).toBe("System");
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
