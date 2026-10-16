import { expect, test } from "./fixtures";
import { getSearchInput, getTagRemoveButton, getTags } from "./utils";
import type { Page } from "@playwright/test";

const URL_TIMEOUT = 20_000;

const submitQuery = async (page: Page, query: string) => {
  const searchInput = getSearchInput(page);
  const hydrated = page.waitForResponse(
    (response) => new URL(response.url()).pathname === "/-/v1/search",
  );
  await searchInput.fill(query);
  await hydrated;
  await searchInput.press("Enter");
  return searchInput;
};

const getClearAll = (page: Page) =>
  page.getByRole("button", { name: "Clear All" }).first();

test.describe("Projects form multi-add", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("adds comma-separated projects at once", async ({ page }) => {
    const searchInput = await submitQuery(page, "react, vue,next");

    for (const name of ["react", "vue", "next"]) {
      await expect(getTagRemoveButton(page, name)).toBeVisible();
    }
    await expect(searchInput).toHaveValue("");
    await expect
      .poll(() => new URL(page.url()).searchParams.get("projects"), {
        timeout: URL_TIMEOUT,
      })
      .toBe("react,vue,next");
  });

  test("reports projects that were not found and adds the rest", async ({
    page,
  }) => {
    await submitQuery(page, "react,missing-a,missing-b");

    await expect(
      page.getByText("Projects not found: missing-a, missing-b"),
    ).toBeVisible();
    await expect(getTagRemoveButton(page, "react")).toBeVisible();
    await expect(getTagRemoveButton(page, "missing-a")).toHaveCount(0);
    await expect(getTagRemoveButton(page, "missing-b")).toHaveCount(0);
  });

  test("warns about projects that are already selected", async ({ page }) => {
    await submitQuery(page, "react,vue");
    await expect(getTagRemoveButton(page, "vue")).toBeVisible();

    await submitQuery(page, "react,vue,next");

    await expect(
      page.getByText("Projects already selected: react, vue"),
    ).toBeVisible();
    await expect(getTagRemoveButton(page, "next")).toBeVisible();
    await expect(getTagRemoveButton(page, "react")).toHaveCount(1);
  });

  test("Clear All empties the tags and the URL", async ({ page }) => {
    await submitQuery(page, "react,vue");
    await expect(getTagRemoveButton(page, "vue")).toBeVisible();

    await getClearAll(page).click();

    await expect(getTagRemoveButton(page, "react")).toHaveCount(0);
    await expect(getTagRemoveButton(page, "vue")).toHaveCount(0);
    await expect(getClearAll(page)).toHaveCount(0);
    await expect(getTags(page).getByText("react")).toHaveCount(0);
    await expect
      .poll(() => new URL(page.url()).searchParams.get("projects"), {
        timeout: URL_TIMEOUT,
      })
      .toBeFalsy();
  });
});
