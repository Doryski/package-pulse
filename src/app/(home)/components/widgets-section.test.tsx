import type { ProjectStats } from "@/lib/queries/useProjectsStats";
import { copyAsImage, downloadAsImage } from "@/lib/utils/imageExport";
import { buildProjectStats, buildSuccessQuery } from "@/test/factories";
import { renderWithProviders } from "@/test/render";
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

const renderSection = (names: string[] = ["react", "vue"]) =>
  renderWithProviders(
    <WidgetsSection projectsStats={buildQueries(...names)} />,
  );

describe("WidgetsSection", () => {
  beforeEach(() => {
    vi.mocked(downloadAsImage).mockClear();
    vi.mocked(copyAsImage).mockClear();
  });

  it("renders nothing while any project is loading", () => {
    renderWithProviders(
      <WidgetsSection
        projectsStats={[...buildQueries("react"), buildPendingQuery(true)]}
      />,
    );

    expect(screen.queryByText("Widgets")).not.toBeInTheDocument();
    expect(screen.queryByText("Stats Cards")).not.toBeInTheDocument();
  });

  it("renders nothing when no project has data", () => {
    renderWithProviders(
      <WidgetsSection projectsStats={[buildPendingQuery(false)]} />,
    );

    expect(screen.queryByText("Widgets")).not.toBeInTheDocument();
    expect(screen.queryByText("Stats Cards")).not.toBeInTheDocument();
  });

  it("renders the heading and all four widgets", () => {
    renderSection();

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
    const { user } = renderSection();
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
    const { user } = renderSection();
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
    expect(barCard.querySelector(".animate-spin")).toBeInTheDocument();

    deferred.resolve();

    await vi.waitFor(() => expect(downloadButton).toBeEnabled());
    expect(barCard.querySelector(".animate-spin")).not.toBeInTheDocument();
  });

  it("copies a whole widget without individual cards", async () => {
    const { user } = renderSection();

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
      const { user } = renderSection();
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
      const { user } = renderSection();

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
      const { user } = renderSection();

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
    const { user } = renderSection(["react", MISSING_CARD_PROJECT]);
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
    const { user } = renderWithProviders(
      <WidgetsSection
        projectsStats={[...buildQueries("react"), buildPendingQuery(false)]}
      />,
    );

    await user.click(
      within(getWidgetCard("Trend Indicators")).getByRole("button", {
        name: "Download a single project card",
      }),
    );

    expect(screen.getAllByRole("menuitem")).toHaveLength(1);
  });
});
