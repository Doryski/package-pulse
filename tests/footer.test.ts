import { links } from "@/lib/config/constants";
import { expect, test } from "@playwright/test";

test.describe("Footer Links", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:3000"); // Adjust the URL to your local development server
  });

  test("should navigate to GitHub profile", async ({ page }) => {
    const [newPage] = await Promise.all([
      page.waitForEvent("popup"),
      page.locator(`a[href="${links.githubProfile}"]`).click(),
    ]);
    await newPage.waitForLoadState("networkidle");
    await expect(newPage).toHaveURL(links.githubProfile);
  });

  test("should navigate to personal website", async ({ page }) => {
    const [newPage] = await Promise.all([
      page.waitForEvent("popup"),
      page.locator(`a[href="${links.personalWebsite}"]`).click(),
    ]);
    await newPage.waitForLoadState("networkidle");
    await expect(newPage).toHaveURL(links.personalWebsite);
  });

  test("should navigate to GitHub repository", async ({ page }) => {
    const [newPage] = await Promise.all([
      page.waitForEvent("popup"),
      page.locator(`a[href="${links.githubRepository}"]`).click(),
    ]);
    await newPage.waitForLoadState("networkidle");
    await expect(newPage).toHaveURL(links.githubRepository);
  });

  test("should navigate to Buy Me a Coffee page", async ({ page }) => {
    const [newPage] = await Promise.all([
      page.waitForEvent("popup"),
      page.locator(`a[href="${links.buyMeACoffee}"]`).click(),
    ]);
    await newPage.waitForLoadState("networkidle");
    await expect(newPage).toHaveURL(links.buyMeACoffee);
  });
});
