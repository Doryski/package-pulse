import { QUICK_COMPARISONS } from "@/lib/config/comparison-presets";
import { projectsToComparePath, slugifyTitle } from "@/lib/utils/slug";
import { expect, type Page } from "@playwright/test";
import { test } from "./fixtures";
import { getTags } from "./utils";

const SITE_URL = "https://www.package-pulse.com";
const SELECTED_PROJECTS_KEY = "pp:selected-projects";

const tag = (page: Page, name: string) =>
  getTags(page).getByText(name, { exact: true });

const canonicalHref = (page: Page) =>
  page.locator("link[rel='canonical']").getAttribute("href");

test.describe("compare pages", () => {
  test("renders tags, chart, title and canonical", async ({ page }) => {
    const response = await page.goto("/compare/react-vs-vue");
    expect(response?.status()).toBe(200);

    await expect(tag(page, "react")).toBeVisible();
    await expect(tag(page, "vue")).toBeVisible();
    await expect(
      page.locator("[data-testid='main-chart'] .recharts-wrapper"),
    ).toBeVisible();
    await expect(page).toHaveTitle(
      "react vs vue — npm download trends | Package Pulse",
    );
    await expect
      .poll(() => canonicalHref(page))
      .toMatch(/\/compare\/react-vs-vue$/);
  });

  test("renders the selection H1 without hydration errors", async ({
    page,
  }) => {
    const hydrationErrors: string[] = [];
    page.on("console", (message) => {
      if (message.type() !== "error") return;
      if (/hydrat/i.test(message.text())) hydrationErrors.push(message.text());
    });
    page.on("pageerror", (error) => {
      if (/hydrat/i.test(error.message)) hydrationErrors.push(error.message);
    });

    await page.goto("/compare/react-vs-vue");

    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "react vs vue npm downloads",
      }),
    ).toBeVisible();
    await expect(
      page.locator("[data-testid='main-chart'] .recharts-wrapper"),
    ).toBeVisible();
    expect(hydrationErrors).toEqual([]);
  });

  test("invalid slug returns 404", async ({ page }) => {
    const response = await page.goto("/compare/%21%21%21");
    expect(response?.status()).toBe(404);
  });

  test("encoded hyphen resolves to hyphenated package", async ({ page }) => {
    await page.goto("/compare/date%2Dfns-vs-dayjs");

    await expect(tag(page, "date-fns")).toBeVisible();
    await expect(tag(page, "dayjs")).toBeVisible();
    await expect(page).toHaveTitle(/^date-fns vs dayjs — /);
  });

  test("scoped package slug resolves", async ({ page }) => {
    await page.goto("/compare/react-vs-@angular/core");

    await expect(tag(page, "react")).toBeVisible();
    await expect(tag(page, "@angular/core")).toBeVisible();
  });

  test("does not overwrite saved selection in localStorage", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: "How Package Pulse Works" }),
    ).toBeVisible();
    await page.getByPlaceholder("Search projects...").click();
    await page.evaluate(
      (key) => localStorage.setItem(key, JSON.stringify(["zod", "yup"])),
      SELECTED_PROJECTS_KEY,
    );

    await page.goto("/compare/react-vs-vue");
    await expect(tag(page, "react")).toBeVisible();
    await expect(page.getByTestId("main-chart")).toBeVisible();

    const stored = await page.evaluate(
      (key) => localStorage.getItem(key),
      SELECTED_PROJECTS_KEY,
    );
    expect(JSON.parse(stored ?? "null")).toEqual(["zod", "yup"]);
  });
});

test.describe("category pages", () => {
  for (const preset of QUICK_COMPARISONS) {
    const slug = slugifyTitle(preset.title);

    test(`/categories/${slug} renders projects and links`, async ({ page }) => {
      const response = await page.goto(`/categories/${slug}`);
      expect(response?.status()).toBe(200);

      await expect(
        page.getByRole("heading", {
          level: 1,
          name: `${preset.title} — npm package comparison`,
        }),
      ).toBeVisible();
      for (const project of preset.projects) {
        await expect(
          page.getByRole("listitem").getByText(project, { exact: true }),
        ).toBeVisible();
      }
      await expect(
        page.getByRole("link", { name: `Compare ${preset.title} downloads` }),
      ).toHaveAttribute("href", projectsToComparePath([...preset.projects]));
      await expect(
        page.getByRole("link", { name: "Back to home" }),
      ).toHaveAttribute("href", "/");
      await expect(page).toHaveTitle(
        `${preset.title} — compare npm packages | Package Pulse`,
      );
    });
  }

  test("unknown category returns 404", async ({ page }) => {
    const response = await page.goto("/categories/nope");
    expect(response?.status()).toBe(404);
  });
});

test.describe("home empty state", () => {
  test("shows hero and how-it-works section", async ({ page }) => {
    await page.goto("/");

    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "Compare NPM Package Downloads & Trends",
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "How Package Pulse Works" }),
    ).toBeVisible();
    await expect(page.getByTestId("main-chart")).toBeHidden();
  });

  test("restores the saved selection without overwriting it", async ({
    page,
  }) => {
    await page.goto("/");
    await page.evaluate(
      (key) => localStorage.setItem(key, JSON.stringify(["zod", "yup"])),
      SELECTED_PROJECTS_KEY,
    );

    await page.goto("/");

    await expect(tag(page, "zod")).toBeVisible();
    await expect(tag(page, "yup")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "How Package Pulse Works" }),
    ).toBeHidden();
    const stored = await page.evaluate(
      (key) => localStorage.getItem(key),
      SELECTED_PROJECTS_KEY,
    );
    expect(JSON.parse(stored ?? "null")).toEqual(["zod", "yup"]);
  });
});

test.describe("crawler files", () => {
  test("sitemap.xml lists home, compare and category pages", async ({
    api,
  }) => {
    const response = await api.get("/sitemap.xml");
    expect(response.status()).toBe(200);
    const body = await response.text();

    const locs = [...body.matchAll(/<loc>([^<]+)<\/loc>/g)].map(
      (match) => match[1] ?? "",
    );
    const expected = [
      SITE_URL,
      ...QUICK_COMPARISONS.map(
        (preset) => `${SITE_URL}${projectsToComparePath([...preset.projects])}`,
      ),
      ...QUICK_COMPARISONS.map(
        (preset) => `${SITE_URL}/categories/${slugifyTitle(preset.title)}`,
      ),
    ];
    expect(locs).toHaveLength(13);
    expect(locs.map((loc) => loc.replace(/&amp;/g, "&"))).toEqual(
      expect.arrayContaining(expected),
    );
  });

  test("robots.txt references the sitemap", async ({ api }) => {
    const response = await api.get("/robots.txt");
    expect(response.status()).toBe(200);
    expect(await response.text()).toContain(`Sitemap: ${SITE_URL}/sitemap.xml`);
  });
});
