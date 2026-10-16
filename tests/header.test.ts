import { expect, test } from "./fixtures";

test("header logo links back to the home page", async ({ page }) => {
  await page.goto("/compare/react-vs-vue");

  const logoLink = page.getByRole("banner").getByRole("link").first();
  await expect(logoLink).toHaveAttribute("href", "/");
  await logoLink.click();

  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByPlaceholder("Search projects...")).toBeVisible();
});
