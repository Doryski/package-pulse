import { expect } from "@playwright/test";
import { test } from "./fixtures";
import { trailingZeroDays } from "./mocks/scenarios";
import { goToProjectsPage } from "./utils";

const LAG_DAYS = 3;

type DownloadsBody = {
  data: Record<string, { date: string; count: number }[] | null>;
};

test.describe("npm reporting lag", () => {
  test("trims not-yet-computed zero days to the shared data horizon", async ({
    api,
    next,
  }) => {
    const cutoff = trailingZeroDays(next, LAG_DAYS);

    const response = await api.get("/api/downloads?packages=react,vue");
    expect(response.status()).toBe(200);
    const body: DownloadsBody = await response.json();

    for (const series of Object.values(body.data)) {
      const last = series?.at(-1);
      expect(last?.date).toBe(cutoff);
      expect(last?.count).toBeGreaterThan(0);
    }
  });

  test("widgets show the latest computed day instead of zero", async ({
    page,
    next,
  }) => {
    trailingZeroDays(next, LAG_DAYS);
    await goToProjectsPage(page, ["react", "vue"]);

    const latestLabels = page.getByText("Latest downloads", { exact: true });
    await expect(latestLabels.first()).toBeVisible({ timeout: 30_000 });

    const latestValues = await latestLabels.evaluateAll((labels) =>
      labels.map((label) => label.previousElementSibling?.textContent ?? ""),
    );
    expect(latestValues).toHaveLength(2);
    for (const value of latestValues) {
      expect(value.replace(/\s/g, "")).not.toBe("0");
    }
  });
});
