import type { APIRequestContext, Locator, Page } from "@playwright/test";
import { expect, ipFromSeed, originHeader, test } from "./fixtures";

test.describe.configure({ mode: "serial" });

const SECTIONS = {
  latest: "Latest Searches or Comparisons",
  popular: "Popular Searches or Comparisons",
} as const;

const ENDPOINTS = {
  comparisons: "/api/comparisons",
  latest: "/api/comparisons?limit=6",
  popular: "/api/comparisons/popular?limit=6&sort=trending",
} as const;

const POPULAR_SEED_COUNT = 30;
const FEED_TIMEOUT = 20_000;
const CARD_TIMEOUT = 10_000;
const URL_SYNC_TIMEOUT = 15_000;

type FeedEntry = { projects: string[] };
type FeedBody = { comparisons: FeedEntry[] };

const randomSuffix = () => Math.random().toString(36).slice(2, 10);

const feedProjects = (runId: string, ...names: string[]) =>
  names.map((name) => `e2e-feed-${runId}-${name}`);

const projectsKey = (projects: readonly string[]) =>
  [...projects].sort().join("|");

const includesProjects = (body: FeedBody, projects: readonly string[]) =>
  body.comparisons.some(
    (entry) => projectsKey(entry.projects) === projectsKey(projects),
  );

const postComparison = (
  api: APIRequestContext,
  baseURL: string,
  projects: readonly string[],
  ip?: string,
) =>
  api.post(ENDPOINTS.comparisons, {
    data: { projects },
    headers: {
      ...originHeader(baseURL),
      ...(ip ? { "x-real-ip": ip } : {}),
    },
  });

const postFromFreshIp = async (
  api: APIRequestContext,
  baseURL: string,
  projects: readonly string[],
) => {
  const response = await postComparison(
    api,
    baseURL,
    projects,
    ipFromSeed(`${projectsKey(projects)}:${randomSuffix()}`),
  );
  expect(response.status()).toBe(201);
};

const seedPopular = async (
  api: APIRequestContext,
  baseURL: string,
  projects: readonly string[],
) => {
  const batchId = randomSuffix();
  const statuses = await Promise.all(
    Array.from({ length: POPULAR_SEED_COUNT }, (_, index) =>
      postComparison(
        api,
        baseURL,
        projects,
        ipFromSeed(`${projectsKey(projects)}:${batchId}:${index}`),
      ).then((response) => response.status()),
    ),
  );
  expect(statuses.every((status) => status === 201)).toBe(true);
};

const readFeed = async (api: APIRequestContext, path: string) => {
  const response = await api.get(path);
  expect(response.status()).toBe(200);
  const body: FeedBody = await response.json();
  return body;
};

const feedSection = (page: Page, heading: string) =>
  page
    .locator("section")
    .filter({ has: page.getByRole("heading", { name: heading }) });

const cardButton = (section: Locator, projects: readonly string[]) =>
  section.getByRole("button", {
    name: `Compare ${projects.join(", ")}`,
    exact: true,
  });

const isLatestFeedUrl = (url: URL) =>
  `${url.pathname}${url.search}` === ENDPOINTS.latest;

const postBeforeLatestFetch = (
  page: Page,
  api: APIRequestContext,
  baseURL: string,
  projects: readonly string[],
  clientIp: string,
) =>
  page.route(isLatestFeedUrl, async (route) => {
    await postFromFreshIp(api, baseURL, projects);
    const response = await route.fetch({
      headers: { ...route.request().headers(), "x-real-ip": clientIp },
    });
    await route.fulfill({ response });
  });

const expectCardShown = async (
  section: Locator,
  projects: readonly string[],
) => {
  await expect(cardButton(section, projects)).toBeAttached({
    timeout: CARD_TIMEOUT,
  });
  for (const project of projects) {
    await expect(section.getByText(project, { exact: true })).toBeVisible();
  }
};

const activateCard = (section: Locator, projects: readonly string[]) =>
  cardButton(section, projects).press("Enter");

const expectProjectsSelected = async (
  page: Page,
  section: Locator,
  projects: readonly string[],
) => {
  for (const project of projects) {
    await expect(
      page.getByRole("button", { name: `Remove ${project}` }),
    ).toBeVisible();
  }
  await expect(section).toBeHidden();
  await expect(page).toHaveURL(
    (url) => url.searchParams.get("projects") === projects.join(","),
    { timeout: URL_SYNC_TIMEOUT },
  );
};

const requireBaseURL = (baseURL: string | undefined) => {
  if (!baseURL) throw new Error("comparisons feed requires use.baseURL");
  return baseURL;
};

test.describe("comparisons feed", () => {
  let runId = "";

  test.beforeAll(() => {
    runId = randomSuffix();
  });

  test("POST same-origin creates a comparison and rejects a duplicate", async ({
    api,
    baseURL,
  }) => {
    const origin = requireBaseURL(baseURL);
    const projects = feedProjects(runId, "dup-a", "dup-b");

    const created = await postComparison(api, origin, projects);
    expect(created.status()).toBe(201);
    expect(await created.json()).toMatchObject({ projects });

    const duplicate = await postComparison(api, origin, projects);
    expect(duplicate.status()).toBe(409);
    expect(await duplicate.json()).toEqual({
      error: "Duplicate comparison detected.",
    });
  });

  test("GET latest comparisons includes a freshly posted one", async ({
    api,
    baseURL,
  }) => {
    const origin = requireBaseURL(baseURL);
    const projects = feedProjects(runId, "latest-a", "latest-b");

    await expect(async () => {
      await postFromFreshIp(api, origin, projects);
      const body = await readFeed(api, ENDPOINTS.latest);
      expect(body.comparisons.length).toBeLessThanOrEqual(6);
      expect(includesProjects(body, projects)).toBe(true);
    }).toPass({ timeout: FEED_TIMEOUT });
  });

  test("empty home shows the latest card and clicking it adds its projects", async ({
    api,
    baseURL,
    clientIp,
    page,
  }) => {
    const origin = requireBaseURL(baseURL);
    const projects = feedProjects(runId, "card-a", "card-b");
    const latest = feedSection(page, SECTIONS.latest);

    await postBeforeLatestFetch(page, api, origin, projects, clientIp);

    await expect(async () => {
      await page.goto("/");
      await expectCardShown(latest, projects);
    }).toPass({ timeout: FEED_TIMEOUT * 3 });

    await expect(
      latest.getByRole("heading", { name: SECTIONS.latest }),
    ).toBeVisible();

    await activateCard(latest, projects);
    await expectProjectsSelected(page, latest, projects);
  });

  test("popular endpoint and section rank a heavily seeded comparison", async ({
    api,
    baseURL,
    page,
  }) => {
    const origin = requireBaseURL(baseURL);
    const projects = feedProjects(runId, "popular-a", "popular-b", "popular-c");

    const popular = feedSection(page, SECTIONS.popular);

    await expect(async () => {
      await seedPopular(api, origin, projects);
      const body = await readFeed(api, ENDPOINTS.popular);
      expect(body.comparisons.length).toBeLessThanOrEqual(6);
      expect(includesProjects(body, projects)).toBe(true);
    }).toPass({ timeout: FEED_TIMEOUT });

    await expect(async () => {
      await page.goto("/");
      await expectCardShown(popular, projects);
    }).toPass({ timeout: FEED_TIMEOUT * 3 });

    await expect(
      popular.getByRole("heading", { name: SECTIONS.popular }),
    ).toBeVisible();

    await activateCard(popular, projects);
    await expectProjectsSelected(page, popular, projects);
  });
});
