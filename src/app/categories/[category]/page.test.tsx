import { QUICK_COMPARISONS } from "@/lib/config/comparison-presets";
import { projectsToComparePath, slugifyTitle } from "@/lib/utils/slug";
import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CategoryPage, { generateMetadata, generateStaticParams } from "./page";

const navigationMock = await vi.hoisted(async () => {
  const { createNavigationMock } = await import("@/test/next-navigation");
  return createNavigationMock();
});

vi.mock("next/navigation", () => navigationMock);

const BASE_URL = "https://www.package-pulse.com";

const toParams = (category: string) => ({
  params: Promise.resolve({ category }),
});

beforeEach(() => {
  navigationMock.reset();
});

describe("generateStaticParams", () => {
  it("generates a slugified category for every quick comparison", () => {
    expect(generateStaticParams()).toEqual([
      { category: "frameworks" },
      { category: "validation" },
      { category: "state-management" },
      { category: "testing" },
      { category: "ui-components" },
      { category: "date-time" },
    ]);
  });
});

describe("generateMetadata", () => {
  it("builds title, canonical and open graph for a known category", async () => {
    const metadata = await generateMetadata(toParams("date-time"));

    expect(metadata.title).toBe(
      "Date & Time — compare npm packages | Package Pulse",
    );
    expect(metadata.description).toContain(
      "date-fns, dayjs, luxon, moment, temporal-polyfill",
    );
    expect(metadata.description).toContain("date & time package popularity");
    expect(metadata.alternates).toEqual({
      canonical: "/categories/date-time",
    });
    expect(metadata.openGraph).toMatchObject({
      url: `${BASE_URL}/categories/date-time`,
      type: "website",
      images: [{ alt: "Package Pulse — Date & Time" }],
    });
    expect(metadata.twitter).toMatchObject({ card: "summary_large_image" });
  });

  it("returns generic metadata without canonical for an unknown category", async () => {
    const metadata = await generateMetadata(toParams("unknown"));

    expect(metadata).toEqual({
      title: "Compare npm packages | Package Pulse",
      description: expect.stringContaining("Browse npm package categories"),
    });
    expect(metadata).not.toHaveProperty("alternates");
  });
});

describe("CategoryPage", () => {
  it.each(QUICK_COMPARISONS)(
    "renders the $title category with its packages and links",
    async (preset) => {
      render(await CategoryPage(toParams(slugifyTitle(preset.title))));

      expect(
        screen.getByRole("heading", {
          level: 1,
          name: `${preset.title} — npm package comparison`,
        }),
      ).toBeInTheDocument();

      const items = within(screen.getByRole("list")).getAllByRole("listitem");
      expect(items.map((item) => item.textContent)).toEqual([
        ...preset.projects,
      ]);

      expect(
        screen.getByRole("link", { name: `Compare ${preset.title} downloads` }),
      ).toHaveAttribute("href", projectsToComparePath([...preset.projects]));
      expect(
        screen.getByRole("link", { name: "Back to home" }),
      ).toHaveAttribute("href", "/");
    },
  );

  it("calls notFound for an unknown category", async () => {
    await expect(CategoryPage(toParams("unknown"))).rejects.toThrow(
      "NEXT_NOT_FOUND",
    );
    expect(navigationMock.notFound).toHaveBeenCalledTimes(1);
  });
});
