import { expect, test } from "./fixtures";

const footerLinks = [
  { name: "GitHub profile", href: "https://github.com/Doryski" },
  { name: "personal website", href: "https://dominikrycharski.com/" },
  {
    name: "GitHub repository",
    href: "https://github.com/Doryski/package-pulse",
  },
] as const;

test.describe("Footer Links", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  for (const { name, href } of footerLinks) {
    test(`should expose a safe external link to ${name}`, async ({ page }) => {
      const link = page.getByRole("contentinfo").locator(`a[href="${href}"]`);

      await expect(link).toBeVisible();
      await expect(link).toHaveAttribute("target", "_blank");
      await expect(link).toHaveAttribute("rel", /noopener/);
      await expect(link).toHaveAttribute("rel", /noreferrer/);
    });
  }
});
