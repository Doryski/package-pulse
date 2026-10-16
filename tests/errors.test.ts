import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import { MOCK_HOSTS } from "./mocks/handlers";
import { notFound, partial, serverError } from "./mocks/scenarios";
import { getTagRemoveButton, getTags, goToProjectsPage } from "./utils";

const DOWNLOADS_RATE_LIMIT = 20;
const RATE_LIMIT_MESSAGE = "Rate limit exceeded. Too many requests.";
const BATCH_ERROR_MESSAGE = "Failed to fetch NPM download data";
const ERROR_BORDER_COLOR = "rgb(255, 0, 0)";
const TOAST_TIMEOUT = 30_000;
const UPSTREAM_RETRY_TIMEOUT = 60_000;

const notFoundMessage = (name: string) => `Package "${name}" not found`;
const partialMessage = (name: string) =>
  `Some download data for "${name}" could not be loaded`;

const getTag = (page: Page, name: string) =>
  getTags(page).filter({ has: getTagRemoveButton(page, name) });

const getToast = (page: Page, message: string) =>
  page.locator("[data-sonner-toast]").filter({ hasText: message });

const expectErrorTag = (page: Page, name: string) =>
  expect(getTag(page, name)).toHaveCSS("border-top-color", ERROR_BORDER_COLOR, {
    timeout: TOAST_TIMEOUT,
  });

const expectHealthyTag = (page: Page, name: string) =>
  expect(getTag(page, name)).not.toHaveCSS(
    "border-top-color",
    ERROR_BORDER_COLOR,
  );

test.describe("download errors", () => {
  test("marks only the missing package and toasts not found", async ({
    page,
    next,
  }) => {
    const missing = "e2e-err-ghost";
    const healthy = "e2e-err-healthy";
    notFound(next, missing);

    await goToProjectsPage(page, [healthy, missing]);

    await expect(getToast(page, notFoundMessage(missing))).toBeVisible({
      timeout: TOAST_TIMEOUT,
    });
    await expectErrorTag(page, missing);
    await expectHealthyTag(page, healthy);
  });

  test("upstream failure toasts batch error and marks the tag", async ({
    page,
    next,
  }) => {
    test.slow();
    const name = "e2e-err-upstream";
    serverError(next, MOCK_HOSTS.npmDownloads);

    await goToProjectsPage(page, [name]);

    await expect(getToast(page, BATCH_ERROR_MESSAGE)).toBeVisible({
      timeout: UPSTREAM_RETRY_TIMEOUT,
    });
    await expectErrorTag(page, name);
  });

  test("partial data shows a warning toast and keeps the tag healthy", async ({
    page,
    next,
  }) => {
    const name = "e2e-err-partial";
    partial(next, name);

    await goToProjectsPage(page, [name]);

    const toast = getToast(page, partialMessage(name));
    await expect(toast).toBeVisible({ timeout: TOAST_TIMEOUT });
    await expect(toast).toHaveAttribute("data-type", "warning");
    await expect(
      page.getByRole("row").filter({ hasText: name }).first(),
    ).toBeVisible();
    await expectHealthyTag(page, name);
  });

  test("rate limited downloads toast the limit message", async ({
    page,
    api,
  }) => {
    const name = "e2e-err-limited";

    for (let attempt = 0; attempt < DOWNLOADS_RATE_LIMIT; attempt++) {
      const response = await api.get("/api/downloads");
      expect([400, 429]).toContain(response.status());
    }
    const exhausted = await api.get("/api/downloads");
    expect(exhausted.status()).toBe(429);
    expect(await exhausted.json()).toEqual({ error: RATE_LIMIT_MESSAGE });

    await goToProjectsPage(page, [name]);

    await expect(getToast(page, RATE_LIMIT_MESSAGE)).toBeVisible({
      timeout: TOAST_TIMEOUT,
    });
    await expectErrorTag(page, name);
  });
});
