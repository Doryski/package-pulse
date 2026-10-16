import type { Page } from "@playwright/test";
import { SELECTED_PROJECTS_LIMIT } from "@/lib/config/constants";
import { projectNames, projectNamesLimit } from "./data";
import { expect, test } from "./fixtures";
import { similar, similarEmpty, similarError } from "./mocks/scenarios";
import { getTags, goToProjectsPage } from "./utils";

const FIRST = "e2e-similar-alpha";
const SECOND = "e2e-similar-beta";
const SUGGESTIONS = [FIRST, SECOND, "e2e-similar-gamma"];
const SELECTED = "react";
const LOAD_TIMEOUT = 30_000;

const getSection = (page: Page) =>
  page.locator("section").filter({
    has: page.getByRole("heading", { name: "Similar projects", level: 2 }),
  });

const getSuggestion = (page: Page, name: string) =>
  getSection(page).getByRole("button", { name });

test.describe("Similar projects", () => {
  test.setTimeout(120_000);

  test("shows suggestions from the model", async ({ page, next }) => {
    similar(next, SUGGESTIONS);
    await goToProjectsPage(page, projectNames);

    await expect(
      page.getByRole("heading", { name: "Similar projects", level: 2 }),
    ).toBeVisible();
    for (const name of SUGGESTIONS) {
      await expect(getSuggestion(page, name)).toBeEnabled({
        timeout: LOAD_TIMEOUT,
      });
    }
  });

  test("adds a clicked suggestion as a tag and to the URL", async ({
    page,
    next,
  }) => {
    similar(next, SUGGESTIONS);
    await goToProjectsPage(page, projectNames);

    const name = FIRST;
    const other = SECOND;
    await getSuggestion(page, name).click();

    await expect(getTags(page).getByText(name)).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`projects=[^&]*${name}`));
    await expect(getSuggestion(page, name)).toHaveCount(0);
    await expect(getSuggestion(page, other)).toBeVisible();
  });

  test("does not offer suggestions that are already selected", async ({
    page,
    next,
  }) => {
    const selected = SELECTED;
    similar(next, [selected, ...SUGGESTIONS]);
    await goToProjectsPage(page, projectNames);

    await expect(getSuggestion(page, FIRST)).toBeVisible({
      timeout: LOAD_TIMEOUT,
    });
    await expect(getSuggestion(page, selected)).toHaveCount(0);
  });

  test("disables suggestions at the selection limit", async ({
    page,
    next,
  }) => {
    similar(next, SUGGESTIONS);
    await goToProjectsPage(page, projectNamesLimit);

    expect(projectNamesLimit).toHaveLength(SELECTED_PROJECTS_LIMIT);
    for (const name of SUGGESTIONS) {
      await expect(getSuggestion(page, name)).toBeDisabled({
        timeout: LOAD_TIMEOUT,
      });
    }
    await expect(getTags(page).getByText(FIRST)).toHaveCount(0);
  });

  test("shows an empty state when nothing similar is found", async ({
    page,
    next,
  }) => {
    similarEmpty(next);
    await goToProjectsPage(page, projectNames);

    await expect(page.getByText("No similar projects found.")).toBeVisible({
      timeout: LOAD_TIMEOUT,
    });
  });

  test("hides the section when the request fails", async ({ page, next }) => {
    similarError(next);
    await goToProjectsPage(page, projectNames);

    await expect(
      page.getByRole("heading", { name: "Similar projects" }),
    ).toBeHidden({ timeout: 15_000 });
    await expect(page.getByText("No similar projects found.")).toBeHidden();
  });
});
