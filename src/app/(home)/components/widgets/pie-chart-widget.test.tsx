import { buildProjectStats, buildSuccessQuery } from "@/test/factories";
import { renderWithProviders } from "@/test/render";
import { render, screen } from "@testing-library/react";
import { cloneElement, type ReactElement, type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import PieChartWidget from "./pie-chart-widget";

type PieDatum = {
  name: string;
  normalizedName: string;
  value: number;
  fill: string;
  total: number;
};

type LabelInput = {
  cx: number;
  cy: number;
  midAngle?: number;
  innerRadius: number;
  outerRadius: number;
  percent?: number;
};

type ContentPayload = {
  payload: Pick<PieDatum, "name" | "normalizedName" | "total">;
  value: number | string;
}[];

type ContentProps = { active?: boolean; payload?: ContentPayload };

type PieStubProps = {
  data: PieDatum[];
  label: (input: LabelInput) => ReactNode;
};

type ContentStubProps = { content: ReactElement<ContentProps> };

const spies = vi.hoisted(() => ({
  pie: vi.fn<(props: PieStubProps) => void>(),
  tooltip: vi.fn<(props: ContentStubProps) => void>(),
  legend: vi.fn<(props: ContentStubProps) => void>(),
}));

vi.mock("recharts", async (importOriginal) => {
  const { mockRecharts } = await import("@/test/recharts");
  const original = await mockRecharts(importOriginal);
  return {
    ...original,
    PieChart: ({ children }: { children: ReactNode }) => (
      <svg data-testid="pie-chart">{children}</svg>
    ),
    Pie: (props: PieStubProps) => {
      spies.pie(props);
      return null;
    },
    Tooltip: (props: ContentStubProps) => {
      spies.tooltip(props);
      return null;
    },
    Legend: (props: ContentStubProps) => {
      spies.legend(props);
      return null;
    },
  };
});

const buildQuery = (projectName: string, latest: number, days = 28) =>
  buildSuccessQuery(
    buildProjectStats(projectName, { days, countAt: () => latest }),
  );

const VUE_QUERY = buildQuery("vue", 1000);
const REACT_QUERY = buildQuery("@scope/react.js", 3000);
const EMPTY_QUERY = buildSuccessQuery(
  buildProjectStats("empty", { rawSortedData: [] }),
);

const LABEL_GEOMETRY = {
  cx: 100,
  cy: 100,
  innerRadius: 30,
  outerRadius: 120,
} as const;

const lastProps = <TProps,>(spy: { mock: { lastCall?: [TProps] } }) => {
  const props = spy.mock.lastCall?.[0];
  if (!props) throw new Error("Component was not rendered");
  return props;
};

const renderWidget = () =>
  renderWithProviders(
    <PieChartWidget projectsStats={[VUE_QUERY, EMPTY_QUERY, REACT_QUERY]} />,
  );

const renderLabel = (input: Partial<LabelInput>) => {
  const { label } = lastProps(spies.pie);
  return render(<svg>{label({ ...LABEL_GEOMETRY, ...input })}</svg>);
};

const renderContent = (spy: typeof spies.tooltip, props: ContentProps) =>
  render(cloneElement(lastProps(spy).content, props));

const buildContentPayload = (): ContentPayload => [
  {
    value: 3000,
    payload: {
      name: "@scope/react.js",
      normalizedName: "_x_scope_x_react_x_js",
      total: 4000,
    },
  },
  {
    value: 1000,
    payload: { name: "vue", normalizedName: "vue", total: 4000 },
  },
];

describe("PieChartWidget", () => {
  beforeEach(() => {
    spies.pie.mockClear();
    spies.tooltip.mockClear();
    spies.legend.mockClear();
  });

  it("shows an empty state when no project has data", () => {
    renderWithProviders(<PieChartWidget projectsStats={[]} />);

    expect(screen.getByText("No data available")).toBeInTheDocument();
    expect(
      screen.getByText("Add some projects to see the distribution"),
    ).toBeInTheDocument();
  });

  it("passes slices sorted by latest downloads with a shared total", () => {
    renderWidget();

    expect(lastProps(spies.pie).data).toEqual([
      expect.objectContaining({
        name: "@scope/react.js",
        normalizedName: "_x_scope_x_react_x_js",
        value: 3000,
        total: 4000,
        fill: "var(--color-_x_scope_x_react_x_js)",
      }),
      expect.objectContaining({ name: "vue", value: 1000, total: 4000 }),
      expect.objectContaining({ name: "empty", value: 0, total: 4000 }),
    ]);
  });

  it("scopes slice colour variables to the chart", () => {
    const { container } = renderWidget();
    const chart = container.querySelector("[data-chart]");
    const chartId = chart?.getAttribute("data-chart");

    expect(chartId).toMatch(/^pie-chart-/);
    expect(chartId).not.toContain(":");
    expect(container.querySelector("style")?.innerHTML).toContain(
      `[data-chart="${chartId}"] { --color-vue: hsl(var(--chart-1)); }`,
    );
    expect(container.querySelector("#gradient-vue")).toBeInTheDocument();
  });

  it.each([
    [{ midAngle: undefined, percent: 0.3 }],
    [{ midAngle: 45, percent: undefined }],
    [{ midAngle: 45, percent: 0.04 }],
  ])("skips the slice label for %o", (input) => {
    renderWidget();

    const { container } = renderLabel(input);

    expect(container.querySelector("text")).not.toBeInTheDocument();
  });

  it("renders a right-anchored percentage label for small slices", () => {
    renderWidget();

    renderLabel({ midAngle: 0, percent: 0.25 });

    const label = screen.getByText("25%");
    expect(label).toHaveAttribute("text-anchor", "start");
    expect(label).toHaveAttribute("x", "184");
  });

  it("pulls large slice labels inward and anchors left-side labels at the end", () => {
    renderWidget();

    renderLabel({ midAngle: 180, percent: 0.6789 });

    const label = screen.getByText("67.9%");
    expect(label).toHaveAttribute("text-anchor", "end");
    expect(Number(label.getAttribute("x"))).toBeCloseTo(29.5);
  });

  it.each([
    [{ active: false, payload: buildContentPayload() }],
    [{ active: true, payload: undefined }],
    [{ active: true, payload: [] }],
  ])("renders no tooltip for %o", (props) => {
    renderWidget();

    const { container } = renderContent(spies.tooltip, props);

    expect(container).toBeEmptyDOMElement();
  });

  it("renders the tooltip with downloads and share", () => {
    renderWidget();

    renderContent(spies.tooltip, {
      active: true,
      payload: buildContentPayload(),
    });

    expect(screen.getByText("@scope/react.js")).toBeInTheDocument();
    expect(screen.getByText(/^3\s000$/)).toBeInTheDocument();
    expect(screen.getByText("75%")).toBeInTheDocument();
  });

  it.each([[undefined], [[]]])(
    "renders no legend for payload %o",
    (payload) => {
      renderWidget();

      const { container } = renderContent(spies.legend, { payload });

      expect(container).toBeEmptyDOMElement();
    },
  );

  it("renders a legend entry per slice", () => {
    renderWidget();

    const payload = buildContentPayload().map((entry) => ({
      ...entry,
      value: entry.payload.name,
    }));

    const { container } = renderContent(spies.legend, { payload });

    expect(screen.getByText("@scope/react.js")).toBeInTheDocument();
    expect(screen.getByText("vue")).toBeInTheDocument();
    expect(container.querySelector(".rounded-full")).toHaveStyle({
      backgroundColor: "var(--color-_x_scope_x_react_x_js)",
    });
  });
});
