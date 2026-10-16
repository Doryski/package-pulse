import { QUICK_COMPARISONS } from "@/lib/config/comparison-presets";
import { describe, expect, it } from "vitest";
import sitemap from "./sitemap";

const BASE_URL = "https://www.package-pulse.com";

describe("sitemap", () => {
  const entries = sitemap();

  it("lists home, compare and category pages", () => {
    expect(entries).toHaveLength(1 + QUICK_COMPARISONS.length * 2);
  });

  it("starts with the home page at top priority", () => {
    expect(entries[0]).toMatchObject({
      url: BASE_URL,
      changeFrequency: "daily",
      priority: 1,
    });
  });

  it("includes compare pages for every quick comparison", () => {
    const compareEntries = entries.filter(({ url }) =>
      url.startsWith(`${BASE_URL}/compare/`),
    );

    expect(compareEntries).toHaveLength(QUICK_COMPARISONS.length);
    expect(compareEntries[0]).toMatchObject({
      url: `${BASE_URL}/compare/react-vs-vue-vs-@angular/core-vs-svelte`,
      changeFrequency: "weekly",
      priority: 0.8,
    });
  });

  it("includes category pages for every quick comparison", () => {
    const categoryUrls = entries
      .filter(({ url }) => url.startsWith(`${BASE_URL}/categories/`))
      .map(({ url }) => url.replace(`${BASE_URL}/categories/`, ""));

    expect(categoryUrls).toEqual([
      "frameworks",
      "validation",
      "state-management",
      "testing",
      "ui-components",
      "date-time",
    ]);
    expect(entries.filter(({ priority }) => priority === 0.7)).toHaveLength(
      QUICK_COMPARISONS.length,
    );
  });

  it("stamps every entry with the same last modified date", () => {
    const lastModifiedValues = new Set(
      entries.map(({ lastModified }) => lastModified),
    );

    expect(lastModifiedValues.size).toBe(1);
    expect([...lastModifiedValues][0]).toBeInstanceOf(Date);
  });
});
