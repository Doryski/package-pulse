import { QUICK_COMPARISONS } from "@/lib/config/comparison-presets";
import { getProjectStatsQueryKey } from "@/lib/queries/keys";
import prefetchCompareStats from "@/lib/server/prefetchCompareStats";
import { projectsToSlug } from "@/lib/utils/slug";
import { buildProjectStats } from "@/test/factories";
import { renderWithProviders } from "@/test/render";
import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ComparePage, {
  dynamicParams,
  generateMetadata,
  generateStaticParams,
  revalidate,
} from "./page";

const navigationMock = await vi.hoisted(async () => {
  const { createNavigationMock } = await import("@/test/next-navigation");
  return createNavigationMock();
});

vi.mock("next/navigation", () => navigationMock);

vi.mock("@/app/(home)/components/home-shell", () => ({
  default: (props: {
    initialProjects: string[];
    persistSelection: boolean;
    selectionHeading: boolean;
  }) => <output aria-label="home shell">{JSON.stringify(props)}</output>,
}));

vi.mock("@/lib/server/prefetchCompareStats", () => ({ default: vi.fn() }));

const BASE_URL = "https://www.package-pulse.com";

const toParams = (slug: string[]) => ({ params: Promise.resolve({ slug }) });

const renderPage = async (slug: string[]) =>
  renderWithProviders(await ComparePage(toParams(slug)));

const getShellProps = () =>
  JSON.parse(
    screen.getByRole("status", { name: "home shell" }).textContent ?? "",
  );

const getJsonLd = (container: HTMLElement) =>
  JSON.parse(
    container.querySelector('script[type="application/ld+json"]')?.innerHTML ??
      "null",
  );

beforeEach(() => {
  navigationMock.reset();
  vi.mocked(prefetchCompareStats).mockReset();
});

describe("compare page config", () => {
  it("allows dynamic params", () => {
    expect(dynamicParams).toBe(true);
  });

  it("revalidates hourly", () => {
    expect(revalidate).toBe(3600);
  });

  it("generates static params for every quick comparison", () => {
    const params = generateStaticParams();

    expect(params).toHaveLength(QUICK_COMPARISONS.length);
    expect(params).toEqual(
      QUICK_COMPARISONS.map((preset) => ({
        slug: projectsToSlug([...preset.projects]).split("/"),
      })),
    );
    expect(params[0]).toEqual({
      slug: ["react-vs-vue-vs-@angular", "core-vs-svelte"],
    });
  });
});

describe("generateMetadata", () => {
  it("builds title, canonical and open graph for a valid slug", async () => {
    const metadata = await generateMetadata(toParams(["react-vs-vue"]));

    expect(metadata.title).toBe(
      "react vs vue — npm download trends | Package Pulse",
    );
    expect(metadata.description).toContain("react vs vue");
    expect(metadata.alternates).toEqual({
      canonical: "/compare/react-vs-vue",
    });
    expect(metadata.openGraph).toMatchObject({
      title: "react vs vue — npm download trends | Package Pulse",
      url: `${BASE_URL}/compare/react-vs-vue`,
      type: "website",
      images: [
        {
          url: `${BASE_URL}/images/share_image.png`,
          alt: "Package Pulse — react vs vue",
        },
      ],
    });
    expect(metadata.twitter).toMatchObject({
      card: "summary_large_image",
      images: [`${BASE_URL}/images/share_image.png`],
    });
  });

  it("joins catch-all segments for scoped packages", async () => {
    const metadata = await generateMetadata(
      toParams(["react-vs-@angular", "core"]),
    );

    expect(metadata.title).toBe(
      "react vs @angular/core — npm download trends | Package Pulse",
    );
    expect(metadata.alternates).toEqual({
      canonical: "/compare/react-vs-@angular/core",
    });
  });

  it("falls back to generic metadata for an invalid slug", async () => {
    const metadata = await generateMetadata(toParams(["Not Valid!"]));

    expect(metadata).toEqual({
      title: "Compare NPM Packages — npm download trends | Package Pulse",
      description: expect.stringContaining("Compare npm package download"),
      alternates: { canonical: "/compare" },
    });
  });
});

describe("ComparePage", () => {
  it("renders the home shell with projects, the selection heading and without persisting selection", async () => {
    await renderPage(["react-vs-vue"]);

    expect(getShellProps()).toEqual({
      initialProjects: ["react", "vue"],
      persistSelection: false,
      selectionHeading: true,
    });
  });

  it("prefetches the selected projects and hydrates them into the client cache", async () => {
    const stats = buildProjectStats("react");
    vi.mocked(prefetchCompareStats).mockImplementation(
      async (queryClient, projects) => {
        queryClient.setQueryData(getProjectStatsQueryKey(projects[0]!), stats);
      },
    );

    const { queryClient } = await renderPage(["react-vs-vue"]);

    expect(prefetchCompareStats).toHaveBeenCalledWith(expect.anything(), [
      "react",
      "vue",
    ]);
    expect(queryClient.getQueryData(getProjectStatsQueryKey("react"))).toEqual(
      stats,
    );
  });

  it("renders software application structured data", async () => {
    const { container } = await renderPage(["react-vs-vue"]);

    expect(getJsonLd(container)).toMatchObject({
      "@type": "SoftwareApplication",
      name: "react vs vue — npm download comparison",
      url: `${BASE_URL}/compare/react-vs-vue`,
    });
  });

  it("truncates more than ten projects to the selection limit", async () => {
    const names = Array.from({ length: 12 }, (_, index) => `pkg${index}`);

    await renderPage([names.join("-vs-")]);

    expect(getShellProps().initialProjects).toEqual(names.slice(0, 10));
  });

  it.each([
    ["an invalid package name", ["Not Valid!"]],
    ["an empty slug", [""]],
  ])("calls notFound for %s", async (_, slug) => {
    await expect(ComparePage(toParams(slug))).rejects.toThrow("NEXT_NOT_FOUND");
    expect(navigationMock.notFound).toHaveBeenCalledTimes(1);
  });
});
