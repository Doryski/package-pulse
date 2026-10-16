import { expect, test } from "./fixtures";
import { seededDownloads } from "./mocks/data";

const CANARY_PACKAGE = "e2e-canary";
const CANARY_DAY = "2024-06-15";

type DownloadsBody = {
  data: Record<string, Array<{ date: string; count: number }> | null>;
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
    const registryResponse = page.waitForResponse(
      (res) =>
        res.url() === `https://registry.npmjs.org/${CANARY_PACKAGE}` &&
        res.status() === 200,
    );

    await page.goto(`/?projects=${CANARY_PACKAGE}`);

    const registry = await registryResponse;
    expect(await registry.json()).toMatchObject({
      name: CANARY_PACKAGE,
      description: `Mock package ${CANARY_PACKAGE}`,
    });
    await expect(
      page.getByRole("row").filter({ hasText: CANARY_PACKAGE }).first(),
    ).toBeVisible();
    expect(unhandledGuard).toEqual([]);
  });
});
