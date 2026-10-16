import { expect, test } from "./fixtures";
import { getSearchInput } from "./utils";

test("smoke test @responsive", async ({ page }) => {
  const pageErrors: Error[] = [];
  page.on("pageerror", (error) => pageErrors.push(error));

  const response = await page.goto("/");
  expect(response?.ok()).toBe(true);

  await expect(getSearchInput(page)).toBeVisible();
  await expect(page.getByText("Package", { exact: true })).toBeVisible();
  await expect(page.getByText("Pulse", { exact: true })).toBeVisible();

  expect(pageErrors).toEqual([]);
});
