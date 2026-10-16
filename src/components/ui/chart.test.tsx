import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ComponentProps } from "react";
import { Line, LineChart } from "recharts";
import { describe, expect, it, vi } from "vitest";
import {
  ChartContainer,
  ChartDotIndicator,
  ChartLegendContent,
  ChartStyle,
  ChartTooltipContent,
  useLineChart as getLineChartStore,
} from "./chart";
import type { ChartConfig } from "./line-chart";

vi.mock("recharts", async (importOriginal) => {
  const { mockRecharts } = await import("@/test/recharts");
  return mockRecharts(importOriginal);
});

type TooltipProps = ComponentProps<typeof ChartTooltipContent>;
type TooltipPayload = NonNullable<TooltipProps["payload"]>;
type LegendPayload = NonNullable<
  ComponentProps<typeof ChartLegendContent>["payload"]
>;

function Icon() {
  return <svg data-testid="config-icon" />;
}

const CONFIG = {
  react: { label: "React", color: "red" },
  vue: { label: "Vue", theme: { light: "green", dark: "lime" } },
  plain: {},
  iconic: { label: "Iconic", icon: Icon, color: "blue" },
} satisfies ChartConfig;

let keyCounter = 0;

const setupStore = (config: ChartConfig = CONFIG) => {
  keyCounter += 1;
  const chartKey = `chart-test-${keyCounter}`;
  const store = getLineChartStore(chartKey);
  act(() => store.getState().setConfig(config));
  return { chartKey, store };
};

const tooltipItem = (overrides: Partial<TooltipPayload[number]> = {}) =>
  ({
    dataKey: "react",
    name: "react",
    value: 1234,
    color: "#f00",
    payload: {},
    ...overrides,
  }) as TooltipPayload[number];

const renderTooltip = (props: Partial<TooltipProps> = {}) => {
  const { chartKey, store } = setupStore();
  const result = render(
    <ChartTooltipContent
      chartKey={chartKey}
      active
      payload={[tooltipItem()]}
      label="react"
      {...props}
    />,
  );
  return { ...result, chartKey, store };
};

describe("ChartStyle", () => {
  it("renders nothing without colors", () => {
    const { container } = render(
      <ChartStyle id="c1" config={{ plain: { label: "Plain" } }} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("emits color and per-theme variables", () => {
    const { container } = render(<ChartStyle id="c1" config={CONFIG} />);
    const css = container.querySelector("style")?.innerHTML ?? "";
    expect(css).toContain("[data-chart=c1]");
    expect(css).toContain(".dark [data-chart=c1]");
    expect(css).toContain("--color-react: red;");
    expect(css).toContain("--color-vue: green;");
    expect(css).toContain("--color-vue: lime;");
    expect(css).not.toContain("--color-plain");
  });

  it("skips themes without a color", () => {
    const { container } = render(
      <ChartStyle
        id="c2"
        config={{ x: { theme: { light: "", dark: "blue" } } }}
      />,
    );
    const css = container.querySelector("style")?.innerHTML ?? "";
    expect(css.match(/--color-x/g)).toHaveLength(1);
    expect(css).toContain("--color-x: blue;");
  });
});

describe("ChartContainer", () => {
  it("uses provided id and renders chart children", () => {
    const { container } = render(
      <ChartContainer id="main" config={CONFIG} className="mx-2">
        <LineChart data={[{ x: 1, react: 2 }]}>
          <Line dataKey="react" />
        </LineChart>
      </ChartContainer>,
    );
    const root = container.querySelector("[data-chart]");
    expect(root).toHaveAttribute("data-chart", "chart-main");
    expect(root).toHaveClass("mx-2");
    expect(screen.getByTestId("responsive-container")).toBeInTheDocument();
  });

  it("generates an id without colons when none is given", () => {
    const { container } = render(
      <ChartContainer config={{}}>
        <LineChart data={[]} />
      </ChartContainer>,
    );
    const id = container
      .querySelector("[data-chart]")
      ?.getAttribute("data-chart");
    expect(id).toMatch(/^chart-/);
    expect(id).not.toContain(":");
  });
});

describe("ChartTooltipContent", () => {
  it("renders nothing when inactive", () => {
    const { container } = renderTooltip({ active: false });
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing without payload", () => {
    const { container } = renderTooltip({ payload: [] });
    expect(container).toBeEmptyDOMElement();
  });

  it("uses config label for a string label and formats numbers", () => {
    renderTooltip({
      payload: [
        tooltipItem(),
        tooltipItem({ dataKey: "vue", name: "vue", value: "n/a" }),
      ],
    });
    expect(screen.getAllByText("React")).toHaveLength(2);
    expect(screen.getByText("Vue")).toBeInTheDocument();
    expect(screen.getByText((1234).toLocaleString())).toBeInTheDocument();
    expect(screen.getByText("n/a")).toBeInTheDocument();
  });

  it("falls back to raw label when not in config", () => {
    renderTooltip({ label: "2024-01-01" });
    expect(screen.getByText("2024-01-01")).toBeInTheDocument();
  });

  it("uses item config label when labelKey is given", () => {
    renderTooltip({ labelKey: "vue", label: "ignored" });
    expect(screen.getByText("Vue")).toBeInTheDocument();
    expect(screen.queryByText("ignored")).not.toBeInTheDocument();
  });

  it("omits label when no value resolves", () => {
    renderTooltip({
      label: undefined,
      payload: [tooltipItem({ dataKey: "plain", name: "plain" })],
    });
    expect(screen.getAllByText("plain")).toHaveLength(1);
  });

  it("applies labelFormatter", () => {
    const labelFormatter = vi.fn(() => "formatted label");
    renderTooltip({ labelFormatter, labelClassName: "lbl" });
    expect(screen.getByText("formatted label")).toHaveClass("lbl");
    expect(labelFormatter).toHaveBeenCalledWith("React", expect.any(Array));
  });

  it("hides the label with hideLabel", () => {
    renderTooltip({ hideLabel: true, label: "2024-01-01" });
    expect(screen.queryByText("2024-01-01")).not.toBeInTheDocument();
  });

  it("nests the label for a single item with a non-dot indicator", () => {
    const { container } = renderTooltip({
      indicator: "line",
      label: "2024-02-02",
    });
    const nested = screen.getByText("2024-02-02");
    expect(nested.parentElement).toHaveClass("grid gap-1.5");
    expect(container.querySelector(".w-1")).toBeInTheDocument();
  });

  it("renders a dashed indicator", () => {
    const { container } = renderTooltip({ indicator: "dashed" });
    expect(container.querySelector(".items-end")).toBeInTheDocument();
  });

  it("uses the formatter when provided", () => {
    const formatter = vi.fn(() => <span>custom row</span>);
    renderTooltip({ formatter });
    expect(screen.getByText("custom row")).toBeInTheDocument();
    expect(formatter).toHaveBeenCalledWith(
      1234,
      "react",
      expect.objectContaining({ dataKey: "react" }),
      0,
      {},
    );
  });

  it("skips the formatter when the item has no name", () => {
    const formatter = vi.fn(() => <span>custom row</span>);
    renderTooltip({
      formatter,
      payload: [tooltipItem({ name: undefined })],
    });
    expect(formatter).not.toHaveBeenCalled();
    expect(screen.getAllByText("React").length).toBeGreaterThan(0);
  });

  it("renders the config icon instead of indicator", () => {
    renderTooltip({
      payload: [tooltipItem({ dataKey: "iconic", name: "iconic" })],
    });
    expect(screen.getByTestId("config-icon")).toBeInTheDocument();
  });

  it("hides the indicator with hideIndicator", () => {
    const { container } = renderTooltip({ hideIndicator: true });
    expect(container.querySelector(".h-2\\.5")).not.toBeInTheDocument();
  });

  it("prefers explicit color over payload fill and item color", () => {
    const { container } = renderTooltip({
      color: "purple",
      payload: [tooltipItem({ payload: { fill: "orange" } })],
    });
    const indicator = container.querySelector<HTMLElement>(".h-2\\.5");
    expect(indicator?.style.getPropertyValue("--indicator-bg")).toBe("purple");
  });

  it("uses payload fill when no color is given", () => {
    const { container } = renderTooltip({
      payload: [tooltipItem({ payload: { fill: "orange" } })],
    });
    const indicator = container.querySelector<HTMLElement>(".h-2\\.5");
    expect(indicator?.style.getPropertyValue("--indicator-bg")).toBe("orange");
  });

  it("resolves config via string fields on the item and nested payload", () => {
    renderTooltip({
      nameKey: "series",
      label: undefined,
      payload: [
        tooltipItem({ series: "vue" } as Partial<TooltipPayload[number]>),
        tooltipItem({
          dataKey: undefined,
          payload: { series: "iconic" },
        }),
      ],
    });
    expect(screen.getByText("Vue")).toBeInTheDocument();
    expect(screen.getByTestId("config-icon")).toBeInTheDocument();
  });

  it("falls back to default keys and skips null values", () => {
    renderTooltip({
      label: 5 as unknown as string,
      payload: [
        tooltipItem({
          dataKey: undefined,
          name: undefined,
          value: null as unknown as number,
          payload: null,
        }),
      ],
    });
    expect(screen.queryByText((1234).toLocaleString())).not.toBeInTheDocument();
  });

  it("ignores non-object payload items in config lookup", () => {
    renderTooltip({
      label: undefined,
      labelKey: "react",
      payload: [7 as unknown as TooltipPayload[number]],
    });
    expect(screen.queryByText("React")).not.toBeInTheDocument();
  });

  it("marks hidden series and renders children", () => {
    const { store } = renderTooltip({ children: <p>extra child</p> });
    act(() => store.getState().toggleElement("react"));
    expect(screen.getByText("extra child")).toBeInTheDocument();
    expect(document.querySelector(".line-through")).toBeInTheDocument();
    expect(document.querySelector(".opacity-50")).toBeInTheDocument();
  });
});

const legendItem = (overrides: Partial<LegendPayload[number]> = {}) =>
  ({
    dataKey: "react",
    value: "react",
    color: "#f00",
    type: "line",
    ...overrides,
  }) as LegendPayload[number];

describe("ChartLegendContent", () => {
  it("renders nothing without payload", () => {
    const { chartKey } = setupStore();
    const { container } = render(
      <ChartLegendContent chartKey={chartKey} payload={[]} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("toggles series visibility via aria-pressed buttons", async () => {
    const user = userEvent.setup();
    const { chartKey, store } = setupStore();
    render(
      <ChartLegendContent
        chartKey={chartKey}
        payload={[legendItem(), legendItem({ dataKey: "vue", value: "vue" })]}
        verticalAlign="top"
      >
        <span>legend child</span>
      </ChartLegendContent>,
    );
    const reactButton = screen.getByRole("button", {
      name: "Toggle React series",
    });
    expect(reactButton).toHaveAttribute("aria-pressed", "true");
    expect(reactButton.parentElement).toHaveClass("pb-3");
    expect(screen.getByText("legend child")).toBeInTheDocument();

    await user.click(reactButton);
    expect(reactButton).toHaveAttribute("aria-pressed", "false");
    expect(store.getState().isHiddenElement("react")).toBe(true);
    expect(screen.getByText("React")).toHaveClass("line-through");

    await user.click(reactButton);
    expect(reactButton).toHaveAttribute("aria-pressed", "true");
    expect(store.getState().isHiddenElement("react")).toBe(false);
  });

  it("uses bottom padding, icons and nameKey", () => {
    const { chartKey } = setupStore();
    render(
      <ChartLegendContent
        chartKey={chartKey}
        nameKey="value"
        payload={[legendItem({ dataKey: "x", value: "iconic" })]}
      />,
    );
    const button = screen.getByRole("button", { name: "Toggle Iconic series" });
    expect(button.parentElement).toHaveClass("pt-3");
    expect(screen.getByTestId("config-icon")).toBeInTheDocument();
  });

  it("renders a color dot with hideIcon and falls back to the raw value", () => {
    const { chartKey } = setupStore();
    const { container } = render(
      <ChartLegendContent
        chartKey={chartKey}
        hideIcon
        payload={[
          legendItem({ dataKey: "iconic", value: "iconic" }),
          legendItem({ dataKey: undefined, value: "unknown" }),
        ]}
      />,
    );
    expect(screen.queryByTestId("config-icon")).not.toBeInTheDocument();
    expect(container.querySelectorAll(".rounded-full")).toHaveLength(2);
    expect(
      screen.getByRole("button", { name: "Toggle unknown series" }),
    ).toBeInTheDocument();
  });

  it("omits aria-label for non-string labels", () => {
    const { chartKey } = setupStore({ node: { label: <em>Node</em> } });
    render(
      <ChartLegendContent
        chartKey={chartKey}
        payload={[legendItem({ dataKey: "node", value: undefined })]}
      />,
    );
    expect(screen.getByRole("button")).not.toHaveAttribute("aria-label");
  });
});

describe("ChartDotIndicator", () => {
  it.each([
    ["dot", ".h-2\\.5"],
    ["line", ".w-1"],
  ] as const)("renders %s indicator", (indicator, selector) => {
    const { container } = render(
      <ChartDotIndicator
        indicator={indicator}
        nestLabel={false}
        indicatorColor="red"
      />,
    );
    expect(container.querySelector(selector)).toBeInTheDocument();
  });

  it("renders dashed indicator", () => {
    const { container } = render(
      <ChartDotIndicator indicator="dashed" nestLabel indicatorColor="red" />,
    );
    expect(container.firstElementChild).not.toHaveClass("rounded-full");
  });
});

describe("useLineChart", () => {
  it("returns the same store for the same key", () => {
    expect(getLineChartStore("same-key")).toBe(getLineChartStore("same-key"));
    expect(getLineChartStore("same-key")).not.toBe(
      getLineChartStore("other-key"),
    );
  });
});
