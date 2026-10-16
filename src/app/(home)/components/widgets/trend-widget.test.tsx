import { buildProjectStats, buildSuccessQuery } from "@/test/factories";
import { renderWithProviders } from "@/test/render";
import { screen, within } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it } from "vitest";
import TrendWidget, { TrendWidgetRef } from "./trend-widget";

const POSITIVE_CLASS = "text-green-600";
const NEGATIVE_CLASS = "text-red-600";

const buildQuery = (
  projectName: string,
  countAt: (index: number) => number,
  days = 28,
) => buildSuccessQuery(buildProjectStats(projectName, { countAt, days }));

const UP_QUERY = buildQuery("trend-up", (index) => 1000 + index * 100);
const DOWN_QUERY = buildQuery("trend-down", (index) => 10_000 - index * 100);
const FLAT_QUERY = buildQuery("trend-flat", () => 500);
const SHORT_QUERY = buildQuery("trend-short", () => 42, 3);

const getTrendCard = (projectName: string) => {
  const card = screen.getByText(projectName).closest<HTMLElement>(".border");
  if (!card) throw new Error(`Trend card for ${projectName} not found`);
  return card;
};

const getNominal = (projectName: string) =>
  within(getTrendCard(projectName)).getByText(/^[+-]?[\d\s]+$/);

const getPercentage = (projectName: string) =>
  within(getTrendCard(projectName)).getByText(/%$/);

describe("TrendWidget", () => {
  it("shows an empty state when no project has data", () => {
    renderWithProviders(<TrendWidget projectsStats={[]} />);

    expect(screen.getByText("No data available")).toBeInTheDocument();
  });

  it("renders an upward trend in green with a plus sign and up arrow", () => {
    renderWithProviders(<TrendWidget projectsStats={[UP_QUERY]} />);
    const card = within(getTrendCard("trend-up"));

    expect(getNominal("trend-up")).toHaveTextContent(/^\+4\s900$/);
    expect(getNominal("trend-up")).toHaveClass(POSITIVE_CLASS);
    expect(getPercentage("trend-up")).toHaveClass(POSITIVE_CLASS);
    expect(card.getByText("↑")).toBeInTheDocument();
    expect(card.getByText(/^3\s700 downloads$/)).toBeInTheDocument();
  });

  it("renders a downward trend in red without a plus sign", () => {
    renderWithProviders(<TrendWidget projectsStats={[DOWN_QUERY]} />);

    expect(getNominal("trend-down")).toHaveTextContent(/^-4\s900$/);
    expect(getNominal("trend-down")).toHaveClass(NEGATIVE_CLASS);
    expect(getPercentage("trend-down")).toHaveClass(NEGATIVE_CLASS);
    expect(
      within(getTrendCard("trend-down")).getByText("↓"),
    ).toBeInTheDocument();
  });

  it("renders a flat trend as zero change", () => {
    renderWithProviders(<TrendWidget projectsStats={[FLAT_QUERY]} />);

    expect(getNominal("trend-flat")).toHaveTextContent(/^0$/);
    expect(getNominal("trend-flat")).toHaveClass(NEGATIVE_CLASS);
    expect(getPercentage("trend-flat")).toHaveTextContent("0%");
  });

  it("falls back to zero when the weekly change cannot be computed", () => {
    renderWithProviders(<TrendWidget projectsStats={[SHORT_QUERY]} />);

    expect(getNominal("trend-short")).toHaveTextContent(/^0$/);
    expect(getPercentage("trend-short")).toHaveTextContent("0%");
    expect(screen.getByText("42 downloads")).toBeInTheDocument();
  });

  it("sorts trends by weekly percentage change descending", () => {
    renderWithProviders(
      <TrendWidget
        projectsStats={[DOWN_QUERY, SHORT_QUERY, FLAT_QUERY, UP_QUERY]}
      />,
    );

    const names = screen
      .getAllByText(/^trend-[a-z]+$/)
      .map((element) => element.textContent);

    expect(names).toEqual([
      "trend-up",
      "trend-short",
      "trend-flat",
      "trend-down",
    ]);
  });

  it("exposes trend card elements through the ref", () => {
    const ref = createRef<TrendWidgetRef>();
    const { rerender } = renderWithProviders(
      <TrendWidget ref={ref} projectsStats={[UP_QUERY, DOWN_QUERY]} />,
    );

    expect(ref.current?.getTrendCardElement("trend-up")).toBe(
      getTrendCard("trend-up"),
    );
    expect(ref.current?.getTrendCardElement("unknown")).toBeNull();

    rerender(<TrendWidget ref={ref} projectsStats={[DOWN_QUERY]} />);

    expect(ref.current?.getTrendCardElement("trend-up")).toBeNull();
  });
});
