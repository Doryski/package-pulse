import { buildProjectStats, buildSuccessQuery } from "@/test/factories";
import { renderWithProviders } from "@/test/render";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import type { TooltipPayload, TooltipProps, YAxisProps } from "recharts";
import { beforeEach, describe, expect, it, vi } from "vitest";
import BarChartWidget, { BarChartMode } from "./bar-chart-widget";

type BarDatum = { name: string; downloads?: number; growth?: number };

const spies = vi.hoisted(() => ({
  tooltip: vi.fn<(props: TooltipProps) => void>(),
  yAxis: vi.fn<(props: YAxisProps) => void>(),
  bar: vi.fn<(props: { dataKey: string }) => void>(),
}));

vi.mock("recharts", async (importOriginal) => {
  const { mockRecharts } = await import("@/test/recharts");
  const original = await mockRecharts(importOriginal);
  return {
    ...original,
    BarChart: ({
      data,
      children,
    }: {
      data: BarDatum[];
      children: ReactNode;
    }) => (
      <div data-testid="bar-chart">
        <ol>
          {data.map((datum) => (
            <li key={datum.name}>
              {`${datum.name}|${datum.downloads ?? "-"}|${datum.growth ?? "-"}`}
            </li>
          ))}
        </ol>
        {children}
      </div>
    ),
    Bar: (props: { dataKey: string }) => {
      spies.bar(props);
      return null;
    },
    YAxis: (props: YAxisProps) => {
      spies.yAxis(props);
      return null;
    },
    Tooltip: (props: TooltipProps) => {
      spies.tooltip(props);
      return null;
    },
    XAxis: () => null,
    CartesianGrid: () => null,
  };
});

const SMALL_QUERY = buildSuccessQuery(
  buildProjectStats("bar-small", { countAt: (index) => 100 + index * 50 }),
);
const BIG_QUERY = buildSuccessQuery(
  buildProjectStats("bar-big", { countAt: (index) => 100_000 - index * 100 }),
);
const SHORT_QUERY = buildSuccessQuery(
  buildProjectStats("bar-short", { days: 3, countAt: () => 42 }),
);

const ALL_QUERIES = [SHORT_QUERY, BIG_QUERY, SMALL_QUERY];

const lastProps = <TProps,>(spy: { mock: { lastCall?: [TProps] } }) => {
  const props = spy.mock.lastCall?.[0];
  if (!props) throw new Error("Component was not rendered");
  return props;
};

const renderWidget = (comparisonMode?: BarChartMode) =>
  renderWithProviders(
    <BarChartWidget
      projectsStats={ALL_QUERIES}
      comparisonMode={comparisonMode}
    />,
  );

const getRenderedNames = () =>
  screen
    .getAllByRole("listitem")
    .map((item) => item.textContent?.split("|")[0]);

const buildPayload = (value: number | undefined, growth?: number) =>
  [
    { value, payload: { growth }, graphicalItemId: "bar" },
  ] satisfies TooltipPayload;

const renderLabel = (label: string, payload?: TooltipPayload) => {
  const { labelFormatter } = lastProps(spies.tooltip);
  return render(<>{labelFormatter?.(label, payload ?? [])}</>);
};

const callFormatter = (value: number | string) => {
  const { formatter } = lastProps(spies.tooltip);
  const item = { value, graphicalItemId: "bar" };
  return formatter?.(value, "name", item, 0, [item]);
};

describe("BarChartWidget", () => {
  beforeEach(() => {
    spies.tooltip.mockClear();
    spies.yAxis.mockClear();
    spies.bar.mockClear();
  });

  it("shows an empty state when no project has data", () => {
    renderWithProviders(<BarChartWidget projectsStats={[]} />);

    expect(screen.getByText("No data available")).toBeInTheDocument();
  });

  it("defaults to growth mode sorted by growth rate", () => {
    renderWidget();

    expect(getRenderedNames()).toEqual(["bar-small", "bar-short", "bar-big"]);
    expect(lastProps(spies.bar).dataKey).toBe("growth");
    expect(screen.getByText(/^bar-short\|42\|-$/)).toBeInTheDocument();
    expect(
      screen.getByText(/^bar-small\|1450\|\d+(\.\d+)?$/),
    ).toBeInTheDocument();
  });

  it("sorts by latest downloads in downloads mode", () => {
    renderWidget("downloads");

    expect(getRenderedNames()).toEqual(["bar-big", "bar-small", "bar-short"]);
    expect(lastProps(spies.bar).dataKey).toBe("downloads");
  });

  it("labels and formats the growth Y axis as percentages", () => {
    renderWidget("growth");
    const { label, tickFormatter } = lastProps(spies.yAxis);

    expect(label).toMatchObject({ value: "Growth Rate (%)" });
    expect(tickFormatter?.(12, 0)).toBe("12%");
  });

  it("labels and formats the downloads Y axis as large numbers", () => {
    renderWidget("downloads");
    const { label, tickFormatter } = lastProps(spies.yAxis);

    expect(label).toMatchObject({ value: "Downloads" });
    expect(tickFormatter?.(1_500_000, 0)).toBe("1.5M");
  });

  it("formats tooltip values per mode and passes non-numbers through", () => {
    renderWidget("growth");

    expect(callFormatter(12.345)).toEqual(["12.3%", "Growth Rate"]);
    expect(callFormatter("n/a")).toBe("n/a");

    renderWidget("downloads");

    expect(callFormatter(2500)).toEqual(["2.5K", "Downloads"]);
  });

  it("shows the growth rate in the tooltip label in growth mode", () => {
    renderWidget("growth");

    renderLabel("bar-small", buildPayload(12.5, 12.5));

    expect(screen.getByText("Project:")).toBeInTheDocument();
    expect(screen.getByText("bar-small")).toBeInTheDocument();
    expect(screen.getByText("Growth rate:")).toBeInTheDocument();
    expect(screen.getByText("12.5%")).toBeInTheDocument();
    expect(screen.queryByText("Downloads:")).not.toBeInTheDocument();
  });

  it("omits the growth rate when the payload has none", () => {
    renderWidget("growth");

    renderLabel("bar-short");

    expect(screen.getByText("bar-short")).toBeInTheDocument();
    expect(screen.queryByText("Growth rate:")).not.toBeInTheDocument();
  });

  it("shows formatted downloads in the tooltip label in downloads mode", () => {
    renderWidget("downloads");

    renderLabel("bar-big", buildPayload(97_400));

    expect(screen.getByText("Downloads:")).toBeInTheDocument();
    expect(screen.getByText(/^97\s400$/)).toBeInTheDocument();
    expect(screen.queryByText("Growth rate:")).not.toBeInTheDocument();
  });

  it("omits downloads in the tooltip label when the value is missing", () => {
    renderWidget("downloads");

    renderLabel("bar-big", buildPayload(undefined));

    expect(screen.queryByText("Downloads:")).not.toBeInTheDocument();
  });
});
