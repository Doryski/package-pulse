import MultipleLineChart from "@/components/ui/line-chart";
import usePackagesInfo from "@/lib/queries/usePackagesInfo";
import { buildProjectStats, buildSuccessQuery } from "@/test/factories";
import { renderWithProviders } from "@/test/render";
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
  config: Record<string, { label: string; color: string; versions: unknown[] }>;
};

const lastChartProps = () =>
  vi.mocked(MultipleLineChart as unknown as (props: ChartProps) => null).mock
    .lastCall?.[0];

const loadingQuery = { ...buildSuccessQuery(undefined), isLoading: true };

describe("ChartSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(usePackagesInfo).mockReturnValue([]);
  });

  it("hides the main chart when there is no data", () => {
    renderWithProviders(<ChartSection projectStats={[]} />);

    const chart = screen.getByTestId("main-chart");
    expect(chart).toHaveClass("hidden");
    expect(lastChartProps()).toMatchObject({
      chartKey: "main-chart",
      data: [],
      config: {},
    });
  });

  it("hides the chart when queries have no data yet", () => {
    renderWithProviders(
      <ChartSection projectStats={[loadingQuery] as never} />,
    );

    expect(screen.getByTestId("main-chart")).toHaveClass("hidden");
    expect(usePackagesInfo).toHaveBeenCalledWith([]);
  });

  it("shows the chart with prepared data and config", () => {
    vi.mocked(usePackagesInfo).mockReturnValue([
      buildSuccessQuery({
        projectName: "react",
        versions: [{ version: "1.0.0", date: "2024-01-02" }],
      }),
    ] as never);

    renderWithProviders(
      <ChartSection
        projectStats={[
          buildSuccessQuery(buildProjectStats("react")),
          buildSuccessQuery(buildProjectStats("@scope/vue")),
        ]}
      />,
    );

    const chart = screen.getByTestId("main-chart");
    expect(chart).not.toHaveClass("hidden");
    expect(screen.getByTestId("line-chart")).toBeInTheDocument();
    expect(usePackagesInfo).toHaveBeenCalledWith(["react", "@scope/vue"]);

    const props = lastChartProps();
    expect(props?.data.length).toBeGreaterThan(0);
    expect(props?.normalizedData.length).toBeGreaterThan(0);
    expect(props?.config).toEqual({
      react: {
        label: "react",
        color: "hsl(var(--chart-1))",
        versions: [{ version: "1.0.0", date: "2024-01-02" }],
      },
      _x_scope_x_vue: {
        label: "@scope/vue",
        color: "hsl(var(--chart-2))",
        versions: [],
      },
    });
  });

  it("exposes a display name for devtools", () => {
    expect(ChartSection.displayName).toBe("ChartSection");
  });
});
