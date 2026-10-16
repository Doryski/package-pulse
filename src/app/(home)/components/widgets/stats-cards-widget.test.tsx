import { buildProjectStats, buildSuccessQuery } from "@/test/factories";
import { renderWithProviders } from "@/test/render";
import { screen, within } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it } from "vitest";
import StatsCardsWidget, { StatsCardsWidgetRef } from "./stats-cards-widget";

const ODD_LAST_CARD_CLASS = "sm:col-span-2";

const buildQuery = (projectName: string, scale: number) =>
  buildSuccessQuery(
    buildProjectStats(projectName, {
      countAt: (index) => (index % 3 === 0 ? 5 : 1) * scale * (index + 1),
    }),
  );

const REACT_QUERY = buildQuery("stats-react", 1000);
const VUE_QUERY = buildQuery("stats-vue", 100);
const SVELTE_QUERY = buildQuery("stats-svelte", 10);

const getCard = (projectName: string) => {
  const card = screen.getByText(projectName).closest<HTMLElement>(".relative");
  if (!card) throw new Error(`Card for ${projectName} not found`);
  return card;
};

describe("StatsCardsWidget", () => {
  it("shows an empty state when no project has data", () => {
    renderWithProviders(<StatsCardsWidget projectsStats={[]} />);

    expect(screen.getByText("No data available")).toBeInTheDocument();
  });

  it("formats latest and peak downloads for every project", () => {
    renderWithProviders(
      <StatsCardsWidget projectsStats={[VUE_QUERY, REACT_QUERY]} />,
    );
    const reactCard = within(getCard("stats-react"));

    expect(reactCard.getAllByText(/^140\s000$/)).toHaveLength(2);
    expect(reactCard.getByText("Latest downloads")).toBeInTheDocument();
    expect(reactCard.getByText("Peak downloads")).toBeInTheDocument();
  });

  it("sorts cards by latest downloads descending", () => {
    renderWithProviders(
      <StatsCardsWidget
        projectsStats={[SVELTE_QUERY, VUE_QUERY, REACT_QUERY]}
      />,
    );

    const titles = screen
      .getAllByText(/^stats-/)
      .map((element) => element.textContent);

    expect(titles).toEqual(["stats-react", "stats-vue", "stats-svelte"]);
  });

  it("centres the last card only when the card count is odd", () => {
    const { rerender } = renderWithProviders(
      <StatsCardsWidget
        projectsStats={[SVELTE_QUERY, VUE_QUERY, REACT_QUERY]}
      />,
    );

    expect(getCard("stats-svelte")).toHaveClass(ODD_LAST_CARD_CLASS);
    expect(getCard("stats-react")).not.toHaveClass(ODD_LAST_CARD_CLASS);

    rerender(<StatsCardsWidget projectsStats={[VUE_QUERY, REACT_QUERY]} />);

    expect(getCard("stats-vue")).not.toHaveClass(ODD_LAST_CARD_CLASS);
  });

  it("colours each card by its original project order", () => {
    renderWithProviders(
      <StatsCardsWidget projectsStats={[VUE_QUERY, REACT_QUERY]} />,
    );

    const colourBar = (projectName: string) =>
      getCard(projectName).querySelector<HTMLElement>(".absolute");

    expect(colourBar("stats-vue")).toHaveStyle({
      backgroundColor: "hsl(var(--chart-1))",
    });
    expect(colourBar("stats-react")).toHaveStyle({
      backgroundColor: "hsl(var(--chart-2))",
    });
  });

  it("exposes project card elements through the ref", () => {
    const ref = createRef<StatsCardsWidgetRef>();
    const { rerender } = renderWithProviders(
      <StatsCardsWidget ref={ref} projectsStats={[VUE_QUERY, REACT_QUERY]} />,
    );

    expect(ref.current?.getProjectCardElement("stats-vue")).toBe(
      getCard("stats-vue"),
    );
    expect(ref.current?.getProjectCardElement("unknown")).toBeNull();

    rerender(<StatsCardsWidget ref={ref} projectsStats={[REACT_QUERY]} />);

    expect(ref.current?.getProjectCardElement("stats-vue")).toBeNull();
  });
});
