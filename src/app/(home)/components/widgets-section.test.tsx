import { getProjectStatsQueryKey } from "@/lib/queries/keys";
import type {
  ProjectStats,
  ProjectStatsQuery,
} from "@/lib/queries/useProjectsStats";
import { copyAsImage, downloadAsImage } from "@/lib/utils/imageExport";
import { buildProjectStats, buildSuccessQuery } from "@/test/factories";
import { createTestQueryClient, renderWithForm } from "@/test/render";
import type { QueryObserverPendingResult } from "@tanstack/react-query";
import { screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import WidgetsSection from "./widgets-section";

const MISSING_CARD_PROJECT = "missing-card";

vi.mock("@/lib/utils/imageExport", () => ({
  downloadAsImage: vi.fn(() => Promise.resolve()),
  copyAsImage: vi.fn(() => Promise.resolve()),
}));

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const { createCardsWidgetStub } = await vi.hoisted(async () => {
  const { createElement, forwardRef, useImperativeHandle } =
    await import("react");
  type StubProps = { projectsStats: { data?: { projectName: string } }[] };

  const createStub = (testIdPrefix: string, getterName: string) =>
    forwardRef<Record<string, (name: string) => HTMLElement | null>, StubProps>(
      ({ projectsStats }, ref) => {
        useImperativeHandle(ref, () => ({
          [getterName]: (name: string) =>
            name === "missing-card"
              ? null
              : document.querySelector<HTMLElement>(
                  `[data-testid="${testIdPrefix}-${name}"]`,
                ),
        }));
        return createElement(
          "div",
          null,
          projectsStats.map(({ data }) =>
            data
              ? createElement("div", {
                  key: data.projectName,
                  "data-testid": `${testIdPrefix}-${data.projectName}`,
                })
              : null,
          ),
        );
      },
    );

  return { createCardsWidgetStub: createStub };
});

vi.mock("./widgets/stats-cards-widget", () => ({
  default: createCardsWidgetStub("stats-card", "getProjectCardElement"),
}));

vi.mock("./widgets/trend-widget", () => ({
  default: createCardsWidgetStub("trend-card", "getTrendCardElement"),
}));

vi.mock("./widgets/bar-chart-widget", () => ({
  default: ({ comparisonMode }: { comparisonMode?: string }) => (
    <div data-testid="bar-chart-stub">{comparisonMode}</div>
  ),
}));

vi.mock("./widgets/pie-chart-widget", () => ({
  default: () => <div data-testid="pie-chart-stub" />,
}));

const WIDGET_TITLES = [
  "Stats Cards",
  "Bar Chart",
  "Pie Chart",
  "Trend Indicators",
] as const;

type WidgetTitle = (typeof WIDGET_TITLES)[number];

function buildPendingQuery(
  isLoading: boolean,
): QueryObserverPendingResult<ProjectStats, Error> {
  return {
    ...buildSuccessQuery(undefined),
    refetch: vi.fn(),
    data: undefined,
    isPending: true,
    isSuccess: false,
    isFetched: false,
    isFetchedAfterMount: false,
    isLoading,
    isInitialLoading: isLoading,
    fetchStatus: isLoading ? "fetching" : "idle",
    isFetching: isLoading,
    status: "pending",
  };
}

const buildQueries = (...names: string[]) =>
  names.map((name) => buildSuccessQuery(buildProjectStats(name)));

const getWidgetCard = (title: WidgetTitle) => {
  const card = screen.getByText(title).closest<HTMLElement>("div.relative");
  if (!card) throw new Error(`Widget card "${title}" not found`);
  return card;
};

const stripWhitespace = (value: string) => value.replace(/\s/g, "");

const getMenuItem = (action: "Download" | "Copy", projectName: string) =>
  screen.getByRole("menuitem", {
    name: (accessibleName) =>
      stripWhitespace(accessibleName) ===
      stripWhitespace(`${action} ${projectName} card`),
  });

const createDeferred = () => {
  let resolve: () => void = () => {};
  const promise = new Promise<void>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
};

const waitForWidgets = () =>
  vi.waitFor(() =>
    expect(
      document.querySelector(".motion-safe\\:animate-pulse"),
    ).not.toBeInTheDocument(),
  );

const createSettledQueryClient = (names: string[]) => {
  const queryClient = createTestQueryClient();
  names.forEach((name) =>
    queryClient.setQueryData(
      getProjectStatsQueryKey(name),
      buildProjectStats(name),
    ),
  );
  return queryClient;
};

const renderWidgets = (
  projectsStats: ProjectStatsQuery[],
  selectedProjects: string[],
  settledProjects: string[] = selectedProjects,
) =>
  renderWithForm(
    <WidgetsSection projectsStats={projectsStats} />,
    { projects: selectedProjects },
    { queryClient: createSettledQueryClient(settledProjects) },
  );

const renderSection = async (names: string[] = ["react", "vue"]) => {
  const result = renderWidgets(buildQueries(...names), names);
  await waitForWidgets();
  return result;
};

describe("WidgetsSection", () => {
  beforeEach(() => {
    vi.mocked(downloadAsImage).mockClear();
    vi.mocked(copyAsImage).mockClear();
  });

  it("renders size-matched skeletons until the widget chunks load", async () => {
    renderWidgets(buildQueries("react", "vue"), ["react", "vue"]);

    const skeletons = document.querySelectorAll<HTMLElement>(
      '[aria-hidden="true"]',
    );
    const skeletonClasses = Array.from(skeletons, (el) => el.className);
    expect(skeletonClasses).toEqual(
      expect.arrayContaining([
        expect.stringContaining("grid-cols-1 gap-4 sm:grid-cols-2"),
        expect.stringContaining("h-[370px]"),
        expect.stringContaining("h-100"),
        expect.stringContaining("space-y-3"),
      ]),
    );
    expect(screen.queryByTestId("pie-chart-stub")).not.toBeInTheDocument();

    expect(await screen.findByTestId("pie-chart-stub")).toBeInTheDocument();
    await waitForWidgets();
  });

  it("renders busy card skeletons while any selected project is pending", () => {
    renderWidgets(buildQueries("react"), ["react", "vue"], ["react"]);

    const section = screen.getByTestId("widgets-section");
    expect(section).toHaveAttribute("aria-busy", "true");
    expect(
      screen.getByRole("heading", { name: "Widgets" }),
    ).toBeInTheDocument();
    const skeletonCards = screen.getAllByTestId(/^widget-skeleton-/);
    expect(skeletonCards.map((card) => card.dataset.testid)).toEqual([
      "widget-skeleton-stats-cards",
      "widget-skeleton-bar-chart",
      "widget-skeleton-pie-chart",
      "widget-skeleton-trend",
    ]);
    WIDGET_TITLES.forEach((title) =>
      expect(screen.getByText(title)).toBeInTheDocument(),
    );
    expect(
      within(screen.getByTestId("widget-skeleton-bar-chart")).getByText(
        "Bar Chart",
      ).parentElement?.parentElement?.lastElementChild,
    ).toHaveClass("h-8", "motion-safe:animate-pulse");
    const contentClasses = skeletonCards.map(
      (card) => card.lastElementChild?.firstElementChild?.className,
    );
    expect(contentClasses).toEqual([
      expect.stringContaining("grid-cols-1 gap-4 sm:grid-cols-2"),
      expect.stringContaining("h-[370px]"),
      expect.stringContaining("h-100"),
      expect.stringContaining("space-y-3"),
    ]);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("drops the busy state once every selected project settled", async () => {
    await renderSection();

    expect(screen.getByTestId("widgets-section")).not.toHaveAttribute(
      "aria-busy",
    );
    expect(screen.queryAllByTestId(/^widget-skeleton-/)).toHaveLength(0);
  });

  it("renders nothing when no project has data", () => {
    renderWidgets([buildPendingQuery(false)], []);

    expect(screen.queryByText("Widgets")).not.toBeInTheDocument();
    expect(screen.queryByText("Stats Cards")).not.toBeInTheDocument();
  });

  it("renders the heading and all four widgets", async () => {
    await renderSection();

    expect(
      screen.getByRole("heading", { name: "Widgets" }),
    ).toBeInTheDocument();
    WIDGET_TITLES.forEach((title) =>
      expect(screen.getByText(title)).toBeInTheDocument(),
    );
    expect(screen.getByTestId("stats-card-react")).toBeInTheDocument();
    expect(screen.getByTestId("trend-card-vue")).toBeInTheDocument();
    expect(screen.getByTestId("pie-chart-stub")).toBeInTheDocument();
    expect(screen.getByTestId("bar-chart-stub")).toHaveTextContent("growth");
  });

  it("toggles the bar chart between growth and downloads", async () => {
    const { user } = await renderSection();
    const barCard = within(getWidgetCard("Bar Chart"));
    const downloadsToggle = barCard.getByRole("radio", { name: "Downloads" });

    await user.click(downloadsToggle);
    expect(screen.getByTestId("bar-chart-stub")).toHaveTextContent("downloads");

    await user.click(downloadsToggle);
    expect(screen.getByTestId("bar-chart-stub")).toHaveTextContent("downloads");

    await user.click(barCard.getByRole("radio", { name: "Growth" }));
    expect(screen.getByTestId("bar-chart-stub")).toHaveTextContent("growth");
  });

  it("downloads a whole widget and shows a spinner until it finishes", async () => {
    const deferred = createDeferred();
    vi.mocked(downloadAsImage).mockReturnValueOnce(deferred.promise);
    const { user } = await renderSection();
    const barCard = getWidgetCard("Bar Chart");
    const downloadButton = within(barCard).getByRole("button", {
      name: "Download widget as PNG",
    });

    await user.click(downloadButton);

    expect(downloadAsImage).toHaveBeenCalledWith(
      screen.getByTestId("bar-chart-stub").parentElement,
      "bar-chart-widget",
    );
    expect(downloadButton).toBeDisabled();
    const spinner = within(barCard).getByRole("status", {
      name: "Exporting Bar Chart widget",
    });
    expect(spinner).toBe(screen.getByTestId("widget-export-loader-bar-chart"));
    expect(spinner).toHaveClass("animate-spin", "motion-reduce:animate-none");

    deferred.resolve();

    await vi.waitFor(() => expect(downloadButton).toBeEnabled());
    expect(
      screen.queryByTestId("widget-export-loader-bar-chart"),
    ).not.toBeInTheDocument();
  });

  it("copies a whole widget without individual cards", async () => {
    const { user } = await renderSection();

    await user.click(
      within(getWidgetCard("Pie Chart")).getByRole("button", {
        name: "Copy widget as image",
      }),
    );

    expect(copyAsImage).toHaveBeenCalledWith(
      screen.getByTestId("pie-chart-stub").parentElement,
    );
  });

  it.each([
    ["Stats Cards", "stats-cards"],
    ["Trend Indicators", "trend"],
  ] as const)(
    "downloads and copies the whole %s widget",
    async (title, widgetId) => {
      const { user } = await renderSection();
      const card = within(getWidgetCard(title));

      await user.click(
        card.getByRole("button", { name: "Download widget as PNG" }),
      );
      await user.click(
        card.getByRole("button", { name: "Copy widget as image" }),
      );

      expect(downloadAsImage).toHaveBeenCalledWith(
        expect.any(HTMLDivElement),
        `${widgetId}-widget`,
      );
      expect(copyAsImage).toHaveBeenCalledWith(expect.any(HTMLDivElement));
    },
  );

  it.each([
    ["Stats Cards", "stats-cards", "stats-card"],
    ["Trend Indicators", "trend", "trend-card"],
  ] as const)(
    "downloads a single project card from the %s widget",
    async (title, widgetId, testIdPrefix) => {
      const { user } = await renderSection();

      await user.click(
        within(getWidgetCard(title)).getByRole("button", {
          name: "Download a single project card",
        }),
      );
      expect(getMenuItem("Download", "react")).toBeInTheDocument();
      await user.click(getMenuItem("Download", "vue"));

      expect(downloadAsImage).toHaveBeenCalledWith(
        screen.getByTestId(`${testIdPrefix}-vue`),
        `vue-${widgetId}-card`,
      );
    },
  );

  it.each([
    ["Stats Cards", "stats-card"],
    ["Trend Indicators", "trend-card"],
  ] as const)(
    "copies a single project card from the %s widget",
    async (title, testIdPrefix) => {
      const { user } = await renderSection();

      await user.click(
        within(getWidgetCard(title)).getByRole("button", {
          name: "Copy a single project card",
        }),
      );
      await user.click(getMenuItem("Copy", "react"));

      expect(copyAsImage).toHaveBeenCalledWith(
        screen.getByTestId(`${testIdPrefix}-react`),
      );
    },
  );

  it("skips the export when the project card element cannot be found", async () => {
    const { user } = await renderSection(["react", MISSING_CARD_PROJECT]);
    const statsCard = within(getWidgetCard("Stats Cards"));

    await user.click(
      statsCard.getByRole("button", { name: "Download a single project card" }),
    );
    await user.click(getMenuItem("Download", MISSING_CARD_PROJECT));
    await user.click(
      statsCard.getByRole("button", { name: "Copy a single project card" }),
    );
    await user.click(getMenuItem("Copy", MISSING_CARD_PROJECT));

    expect(downloadAsImage).not.toHaveBeenCalled();
    expect(copyAsImage).not.toHaveBeenCalled();
  });

  it("lists only projects with data in the per-project dropdown", async () => {
    const { user } = renderWidgets(
      [...buildQueries("react"), buildPendingQuery(false)],
      ["react"],
    );
    await waitForWidgets();

    await user.click(
      within(getWidgetCard("Trend Indicators")).getByRole("button", {
        name: "Download a single project card",
      }),
    );

    expect(screen.getAllByRole("menuitem")).toHaveLength(1);
  });
});
