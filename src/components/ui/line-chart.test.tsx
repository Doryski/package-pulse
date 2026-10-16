import { renderWithProviders } from "@/test/render";
import { act, screen, within } from "@testing-library/react";
import { cloneElement, isValidElement, ReactNode } from "react";
import { toast } from "sonner";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { exportCsv } from "@/lib/utils/exportUtils";
import { copyAsImage, downloadAsImage } from "@/lib/utils/imageExport";
import MultipleLineChart, {
  ChartConfig,
  ChartData,
  LastReleasesList,
  NormalizedChartData,
  useLineChart as getLineChartStore,
} from "./line-chart";
import { getSeriesKeys } from "./line-chart-utils";

const navigationMock = await vi.hoisted(async () => {
  const { createNavigationMock } = await import("@/test/next-navigation");
  return createNavigationMock({ pathname: "/" });
});

vi.mock("next/navigation", () => navigationMock);

const TOOLTIP_PAYLOAD = [
  {
    dataKey: "react",
    name: "react",
    value: 4321,
    color: "#f00",
    payload: { weekIndex: 3 },
  },
];

type ContentProps = { content?: ReactNode };

function TooltipStub({ content }: ContentProps) {
  if (!isValidElement<Record<string, unknown>>(content)) return null;
  return cloneElement(content, {
    active: true,
    payload: TOOLTIP_PAYLOAD,
    label: "2024-01-08",
  });
}

vi.mock("recharts", async (importOriginal) => {
  const { mockRecharts } = await import("@/test/recharts");
  const mocked = await mockRecharts(importOriginal);
  return { ...mocked, Tooltip: TooltipStub };
});

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() },
}));

vi.mock("@/lib/utils/imageExport", () => ({
  copyAsImage: vi.fn(),
  downloadAsImage: vi.fn(),
}));

vi.mock("@/lib/utils/exportUtils", () => ({
  exportCsv: vi.fn(),
}));

const suspension = vi.hoisted(() => ({
  promise: null as Promise<void> | null,
}));

vi.mock("./line-chart-utils", async (importOriginal) => {
  const original = await importOriginal<typeof import("./line-chart-utils")>();
  return {
    ...original,
    getSeriesKeys: vi.fn(
      (...args: Parameters<typeof original.getSeriesKeys>) => {
        if (suspension.promise) throw suspension.promise;
        return original.getSeriesKeys(...args);
      },
    ),
  };
});

const toChartData = (time: string, series: Record<string, number>) =>
  Object.entries(series).reduce<ChartData>(
    (row, [key, value]) => ({ ...row, [key]: value }),
    { time } as ChartData,
  );

const DATA = [
  toChartData("2024-01-01", { react: 100, vue: 0 }),
  toChartData("2024-01-08", { react: 200, vue: 50 }),
];

const NORMALIZED_DATA: NormalizedChartData[] = [
  { weekIndex: 0, react: 10, vue: 5 },
  { weekIndex: 1, react: 20, vue: 0 },
];

const CONFIG: ChartConfig = {
  react: {
    label: "React",
    color: "red",
    versions: [
      { version: "18.2.0", date: "2024-01-03" },
      { version: "18.10.0", date: "2024-01-09" },
    ],
  },
  vue: { label: "Vue", color: "green" },
};

let keyCounter = 0;

const renderChart = (
  props: Partial<Parameters<typeof MultipleLineChart>[0]> = {},
) => {
  keyCounter += 1;
  const chartKey = `line-chart-test-${keyCounter}`;
  const store = getLineChartStore(chartKey);
  act(() => store.getState().setConfig(CONFIG));
  const result = renderWithProviders(
    <MultipleLineChart
      chartKey={chartKey}
      data={DATA}
      normalizedData={NORMALIZED_DATA}
      config={CONFIG}
      {...props}
    />,
  );
  return { ...result, chartKey, store };
};

const getToggle = (name: string) => screen.getByRole("radio", { name });

const openShareMenu = async (user: ReturnType<typeof renderChart>["user"]) => {
  await user.click(screen.getByRole("button", { name: /share/i }));
  return screen.findByRole("menu");
};

const clickShareItem = async (
  user: ReturnType<typeof renderChart>["user"],
  name: string,
) => {
  const menu = await openShareMenu(user);
  await user.click(within(menu).getByRole("menuitem", { name }));
};

beforeEach(() => {
  localStorage.clear();
  navigationMock.reset();
  suspension.promise = null;
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("MultipleLineChart", () => {
  it("renders controls, legend, tooltip and release reference lines", () => {
    const { container } = renderChart();
    expect(screen.getByRole("combobox")).toHaveTextContent("All time");
    expect(getToggle("Linear")).toHaveAttribute("aria-checked", "true");
    expect(getToggle("Calendar dates")).toHaveAttribute("aria-checked", "true");
    expect(
      screen.getByRole("button", { name: "Toggle React series" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Last release date")).toBeInTheDocument();
    expect(screen.getAllByText("2024-01-08").length).toBeGreaterThan(1);
    expect(screen.getByText("18.10.0 (2024-01-09)")).toBeInTheDocument();
    expect(
      container.querySelector(".recharts-reference-line"),
    ).toBeInTheDocument();
    expect(screen.queryByTestId("main-chart-loader")).not.toBeInTheDocument();
  });

  it("hides the wrapper when there is no data", () => {
    renderChart({ data: [] });
    expect(screen.getByText("Time period").closest(".gap-8")).toHaveClass(
      "hidden",
    );
  });

  it("toggles the logarithmic scale and persists it", async () => {
    const { user } = renderChart();
    await user.click(getToggle("Logarithmic"));
    expect(getToggle("Logarithmic")).toHaveAttribute("aria-checked", "true");
    expect(localStorage.getItem("pp:chart-scale")).toBe('"logarithmic"');
    expect(navigationMock.router.replace).toHaveBeenLastCalledWith(
      "/?scale=logarithmic",
      { scroll: false },
    );

    await user.click(getToggle("Logarithmic"));
    expect(getToggle("Logarithmic")).toHaveAttribute("aria-checked", "true");

    await user.click(getToggle("Linear"));
    expect(localStorage.getItem("pp:chart-scale")).toBe('"linear"');
  });

  it("switches to normalized mode and disables the time period select", async () => {
    const { user } = renderChart();
    await user.click(getToggle("Since first release"));
    expect(getToggle("Since first release")).toHaveAttribute(
      "aria-checked",
      "true",
    );
    expect(screen.getByRole("combobox")).toBeDisabled();
    expect(screen.queryByText("Last release date")).not.toBeInTheDocument();
    expect(screen.getByText("wk 3")).toBeInTheDocument();
    expect(localStorage.getItem("pp:chart-mode")).toBe('"normalized"');

    await user.click(getToggle("Since first release"));
    expect(getToggle("Since first release")).toHaveAttribute(
      "aria-checked",
      "true",
    );
  });

  it("changes the time period", async () => {
    const { user } = renderChart();
    await user.click(screen.getByRole("combobox"));
    await user.click(await screen.findByRole("option", { name: "1 month" }));
    expect(screen.getByRole("combobox")).toHaveTextContent("1 month");
    expect(localStorage.getItem("pp:time-period")).toBe('"months-1"');
    expect(navigationMock.router.replace).toHaveBeenLastCalledWith(
      "/?period=months-1",
      { scroll: false },
    );
  });

  it("restores initial values from search params", () => {
    navigationMock.setSearchParams(
      "period=years-1&scale=logarithmic&mode=normalized",
    );
    renderChart();
    expect(screen.getByRole("combobox")).toHaveTextContent("1 year");
    expect(getToggle("Logarithmic")).toHaveAttribute("aria-checked", "true");
    expect(getToggle("Since first release")).toHaveAttribute(
      "aria-checked",
      "true",
    );
  });

  it("restores the stored chart mode without a mode param", () => {
    localStorage.setItem("pp:chart-mode", JSON.stringify("normalized"));
    renderChart();
    expect(getToggle("Since first release")).toHaveAttribute(
      "aria-checked",
      "true",
    );
  });

  it("ignores an invalid stored chart mode", () => {
    localStorage.setItem("pp:chart-mode", JSON.stringify("bogus"));
    renderChart();
    expect(getToggle("Calendar dates")).toHaveAttribute("aria-checked", "true");
  });

  it("prefers the mode param over the stored chart mode", () => {
    localStorage.setItem("pp:chart-mode", JSON.stringify("normalized"));
    navigationMock.setSearchParams("mode=absolute");
    renderChart();
    expect(getToggle("Calendar dates")).toHaveAttribute("aria-checked", "true");
  });

  it("hides a series and its reference line via the legend", async () => {
    const { user, container, store } = renderChart();
    await user.click(
      screen.getByRole("button", { name: "Toggle React series" }),
    );
    expect(store.getState().isHiddenElement("react")).toBe(true);
    expect(
      container.querySelector(".recharts-reference-line"),
    ).not.toBeInTheDocument();
  });

  it("downloads the chart as PNG", async () => {
    const { user } = renderChart();
    await user.click(
      screen.getByRole("button", { name: "Download chart as PNG" }),
    );
    expect(downloadAsImage).toHaveBeenCalledWith(
      expect.any(HTMLDivElement),
      expect.stringMatching(/^package-pulse-chart-\d+$/),
      "Chart",
    );
  });

  it("copies the chart image", async () => {
    const { user } = renderChart();
    await clickShareItem(user, "Copy image");
    expect(copyAsImage).toHaveBeenCalledWith(
      expect.any(HTMLDivElement),
      "Chart",
    );
  });

  it("exports the visible chart data as CSV", async () => {
    const { user } = renderChart();
    await clickShareItem(user, "Export CSV");
    expect(exportCsv).toHaveBeenCalledWith(
      expect.stringMatching(/^package-pulse-chart-\d+$/),
      DATA,
    );
  });

  it("copies the page link and shows a success toast", async () => {
    const { user } = renderChart();
    const writeText = vi
      .spyOn(navigator.clipboard, "writeText")
      .mockResolvedValue();
    await clickShareItem(user, "Copy link");
    expect(writeText).toHaveBeenCalledWith(window.location.href);
    expect(toast.success).toHaveBeenCalledWith("Link copied to clipboard");
  });

  it("shows an error toast when copying the link fails", async () => {
    const { user } = renderChart();
    const error = new Error("denied");
    vi.spyOn(navigator.clipboard, "writeText").mockRejectedValue(error);
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    await clickShareItem(user, "Copy link");
    expect(toast.error).toHaveBeenCalledWith("Failed to copy link");
    expect(consoleError).toHaveBeenCalledWith("Error copying link:", error);
  });

  it("opens Share to X in a new window", async () => {
    const { user } = renderChart();
    const open = vi.spyOn(window, "open").mockReturnValue(null);
    await clickShareItem(user, "Share to X");
    expect(open).toHaveBeenCalledWith(
      expect.stringContaining("https://twitter.com/intent/tweet?text="),
      "_blank",
      "noopener,noreferrer",
    );
    expect(open.mock.calls[0]?.[0]).toContain(
      encodeURIComponent(window.location.href),
    );
  });

  it("shows the loader while a transition is pending", async () => {
    const { user } = renderChart();
    let resolve = () => {};
    suspension.promise = new Promise<void>((done) => {
      resolve = done;
    });
    await user.click(getToggle("Since first release"));
    expect(await screen.findByTestId("main-chart-loader")).toHaveAttribute(
      "aria-label",
      "Updating chart",
    );

    suspension.promise = null;
    await act(async () => resolve());
    expect(screen.queryByTestId("main-chart-loader")).not.toBeInTheDocument();
    expect(vi.mocked(getSeriesKeys)).toHaveBeenCalled();
  });
});

describe("LastReleasesList", () => {
  it("lists latest releases with label fallback and dash", () => {
    renderWithProviders(
      <LastReleasesList
        config={{
          react: CONFIG.react!,
          solid: {},
        }}
      />,
    );
    expect(screen.getByText("Last releases")).toBeInTheDocument();
    expect(screen.getByText("React")).toBeInTheDocument();
    expect(screen.getByText("18.10.0 (2024-01-09)")).toBeInTheDocument();
    expect(screen.getByText("solid")).toBeInTheDocument();
    expect(screen.getByText("-")).toBeInTheDocument();
  });
});
