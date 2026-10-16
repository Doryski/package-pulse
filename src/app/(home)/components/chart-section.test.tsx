import MultipleLineChart from "@/components/ui/line-chart";
import { useLatestReleases } from "@/lib/queries/usePackagesInfo";
import { buildProjectStats, buildSuccessQuery } from "@/test/factories";
import { getProjectStatsQueryKey } from "@/lib/queries/keys";
import { createTestQueryClient, renderWithForm } from "@/test/render";
import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ChartSection from "./chart-section";

vi.mock("@/lib/queries/usePackagesInfo");
vi.mock("@/components/ui/line-chart", () => ({
  default: vi.fn(() => <div data-testid="line-chart" />),
}));

type ChartProps = {
  chartKey: string;
  data: { time: string }[];
  normalizedData: unknown[];
  config: Record<
    string,
    { label: string; color: string; latestRelease: unknown }
  >;
};

const lastChartProps = () =>
  vi.mocked(MultipleLineChart as unknown as (props: ChartProps) => null).mock
    .lastCall?.[0];

const loadingQuery = { ...buildSuccessQuery(undefined), isLoading: true };

describe("ChartSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useLatestReleases).mockReturnValue([]);
  });

  it("hides the main chart when there is no data", () => {
    renderWithForm(<ChartSection projectStats={[]} />);

    const chart = screen.getByTestId("main-chart");
    expect(chart).toHaveClass("hidden");
    expect(lastChartProps()).toMatchObject({
      chartKey: "main-chart",
      data: [],
      config: {},
    });
  });

  it("hides the chart when the selected stats settled without data", async () => {
    const queryClient = createTestQueryClient();
    await queryClient.prefetchQuery({
      queryKey: getProjectStatsQueryKey("react"),
      queryFn: () => Promise.reject(new Error("boom")),
    });

    renderWithForm(
      <ChartSection projectStats={[loadingQuery] as never} />,
      { projects: ["react"] },
      { queryClient },
    );

    expect(screen.getByTestId("main-chart")).toHaveClass("hidden");
    expect(screen.queryByTestId("main-chart-skeleton")).not.toBeInTheDocument();
    expect(useLatestReleases).toHaveBeenCalledWith([]);
  });

  it("renders the size-matched chart skeleton while selected stats are pending", () => {
    renderWithForm(<ChartSection projectStats={[]} />, {
      projects: ["react"],
    });

    const skeleton = screen.getByTestId("main-chart-skeleton");
    expect(skeleton).toHaveAttribute("aria-busy", "true");
    expect(skeleton).toHaveClass("mt-4", "size-full", "md:mt-8", "lg:mt-16");
    expect(skeleton.firstElementChild).toHaveClass(
      "aspect-square",
      "max-h-[450px]",
      "sm:aspect-video",
      "motion-safe:animate-pulse",
    );
    expect(screen.queryByTestId("main-chart")).not.toBeInTheDocument();
    expect(screen.queryByTestId("line-chart")).not.toBeInTheDocument();
  });

  it("shows the chart with prepared data and config", () => {
    vi.mocked(useLatestReleases).mockReturnValue([
      { version: "1.0.0", date: "2024-01-02" },
      null,
    ]);

    renderWithForm(
      <ChartSection
        projectStats={[
          buildSuccessQuery(buildProjectStats("react")),
          buildSuccessQuery(buildProjectStats("@scope/vue")),
        ]}
      />,
      { projects: ["react", "@scope/vue"] },
    );

    expect(screen.queryByTestId("main-chart-skeleton")).not.toBeInTheDocument();
    const chart = screen.getByTestId("main-chart");
    expect(chart).not.toHaveClass("hidden");
    expect(screen.getByTestId("line-chart")).toBeInTheDocument();
    expect(useLatestReleases).toHaveBeenCalledWith(["react", "@scope/vue"]);

    const props = lastChartProps();
    expect(props?.data.length).toBeGreaterThan(0);
    expect(props?.normalizedData.length).toBeGreaterThan(0);
    expect(props?.config).toEqual({
      react: {
        label: "react",
        color: "hsl(var(--chart-1))",
        latestRelease: { version: "1.0.0", date: "2024-01-02" },
      },
      _x_scope_x_vue: {
        label: "@scope/vue",
        color: "hsl(var(--chart-2))",
        latestRelease: null,
      },
    });
  });

  it("exposes a display name for devtools", () => {
    expect(ChartSection.displayName).toBe("ChartSection");
  });
});
