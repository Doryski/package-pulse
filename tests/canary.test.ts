import { expect, test } from "./fixtures";
import { seededDownloads } from "./mocks/data";
import {
  fillSearchInput,
  getOptionsList,
  getSearchInput,
  waitForSearchResponse,
} from "./utils";

const CANARY_PACKAGE = "e2e-canary";
const CANARY_DAY = "2024-06-15";

type DownloadsBody = {
  data: Record<string, Array<{ date: string; count: number }> | null>;
};

type SearchBody = {
  objects: Array<{ package: { name: string; description: string } }>;
};

const countOn = (body: DownloadsBody, pkg: string, day: string) =>
  body.data[pkg]?.find((entry) => entry.date === day)?.count;

test.describe("test mode canary", () => {
  test("server-side upstream fetches are intercepted", async ({ api }) => {
    const response = await api.get(`/api/downloads?packages=${CANARY_PACKAGE}`);

    expect(response.status()).toBe(200);
    const body: DownloadsBody = await response.json();
    expect(countOn(body, CANARY_PACKAGE, CANARY_DAY)).toBe(
      seededDownloads(CANARY_PACKAGE, CANARY_DAY),
    );
  });

  test("browser-side upstream fetches are intercepted", async ({
    page,
    unhandledGuard,
  }) => {
    await page.goto("/");
    const searchResponse = waitForSearchResponse(page, CANARY_PACKAGE);

    await fillSearchInput(getSearchInput(page), CANARY_PACKAGE);

    const search = await searchResponse;
    expect(search.status()).toBe(200);
    const body: SearchBody = await search.json();
    expect(body.objects[0]?.package).toMatchObject({
      name: CANARY_PACKAGE,
      description: `Mock package ${CANARY_PACKAGE}`,
    });
    await expect(
      getOptionsList(page)
        .getByRole("option")
        .filter({ hasText: CANARY_PACKAGE })
        .first(),
    ).toBeVisible();
    expect(unhandledGuard).toEqual([]);
  });
});
