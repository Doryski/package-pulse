import { expect as baseExpect, type Page } from "@playwright/test";
import { test } from "./fixtures";
import { getTags } from "./utils";

const expect = baseExpect.configure({ timeout: 30_000 });

const FRAMEWORKS = ["react", "vue", "@angular/core", "svelte"];
const VALIDATION = ["zod", "yup", "joi", "valibot", "arktype"];

const quickCard = (page: Page, title: string, projects: string[]) =>
  page.getByRole("button", {
    name: `Compare ${title}: ${projects.join(", ")}`,
  });

const savedToggle = (page: Page) =>
  page.getByRole("button", { name: /^(Save comparison|Saved)$/ });

const addFrameworks = async (page: Page) => {
  await quickCard(page, "Frameworks", FRAMEWORKS).click();
  await expect(savedToggle(page)).toBeVisible();
};

const clearAll = (page: Page) =>
  page.getByRole("button", { name: "Clear All" }).first().click();

test.describe("local comparisons", () => {
  test("quick comparison adds its projects", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: "Quick Comparisons" }),
    ).toBeVisible();

    await addFrameworks(page);

    for (const project of FRAMEWORKS) {
      await expect(
        getTags(page).getByText(project, { exact: true }),
      ).toBeVisible();
    }
    await expect
      .poll(() => new URL(page.url()).searchParams.get("projects"), {
        timeout: 30_000,
      })
      .toBe(FRAMEWORKS.join(","));
    await expect(
      page.getByRole("heading", { name: "Quick Comparisons" }),
    ).toHaveCount(0);
  });

  test("saves, lists and removes a comparison", async ({ page }) => {
    await page.goto("/");
    await addFrameworks(page);

    const toggle = savedToggle(page);
    await expect(toggle).toHaveAccessibleName("Save comparison");
    await expect(toggle).toHaveAttribute("aria-pressed", "false");
    await toggle.click();
    await expect(toggle).toHaveAccessibleName("Saved");
    await expect(toggle).toHaveAttribute("aria-pressed", "true");

    await clearAll(page);
    await expect(
      page.getByRole("heading", { name: "Saved comparisons" }),
    ).toBeVisible();
    await expect(
      quickCard(page, FRAMEWORKS.join(", "), FRAMEWORKS),
    ).toBeVisible();

    await page
      .getByRole("button", {
        name: `Remove saved comparison ${FRAMEWORKS.join(", ")}`,
      })
      .click();
    await expect(
      page.getByRole("heading", { name: "Saved comparisons" }),
    ).toHaveCount(0);
  });

  test("saved comparison persists across reload and can be reopened", async ({
    page,
  }) => {
    await page.goto("/");
    await quickCard(page, "Validation", VALIDATION).click();
    await savedToggle(page).click();
    await expect(savedToggle(page)).toHaveAttribute("aria-pressed", "true");
    await clearAll(page);
    await expect(
      page.getByRole("heading", { name: "Saved comparisons" }),
    ).toBeVisible();

    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: "Saved comparisons" }),
    ).toBeVisible();
    await quickCard(page, VALIDATION.join(", "), VALIDATION).click();

    for (const project of VALIDATION) {
      await expect(
        getTags(page).getByText(project, { exact: true }),
      ).toBeVisible();
    }
    await expect(savedToggle(page)).toHaveAttribute("aria-pressed", "true");
  });
});
