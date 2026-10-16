import { screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { BreakDropIndicator } from "@/lib/utils/calculateBreakDrop";
import { renderWithProviders } from "@/test/render";
import BreakDropIndicatorComponent from "./break-drop-indicator";

const baseIndicator = {
  christmasDropPercentage: 40,
  weekendDropPercentage: 25,
  corporateUsageScore: 30,
  corporateUsageLevel: "high",
  hasEnoughData: true,
} as const satisfies BreakDropIndicator;

describe("BreakDropIndicatorComponent", () => {
  test("shows insufficient data with tooltip", async () => {
    const { user } = renderWithProviders(
      <BreakDropIndicatorComponent
        indicator={{ ...baseIndicator, hasEnoughData: false }}
        className="extra"
      />,
    );
    expect(screen.getByText("Insufficient data")).toBeInTheDocument();
    const icon = document.querySelector("svg");
    await user.hover(icon as Element);
    expect(await screen.findByRole("tooltip")).toHaveTextContent(
      "Not enough download data",
    );
  });

  test.each([
    ["very_high", "Very High Corporate"],
    ["high", "High Corporate"],
    ["moderate", "Moderate Corporate"],
    ["low", "Low Corporate"],
    ["very_low", "Very Low Corporate"],
  ] as const)("renders %s level badge", (level, label) => {
    renderWithProviders(
      <BreakDropIndicatorComponent
        indicator={{ ...baseIndicator, corporateUsageLevel: level }}
      />,
    );
    expect(screen.getByText(label)).toBeInTheDocument();
    expect(screen.getByText(/Christmas:/)).toBeInTheDocument();
    expect(screen.getByText(/Weekend:/)).toBeInTheDocument();
  });

  test("shows analysis tooltip for badge", async () => {
    const { user } = renderWithProviders(
      <BreakDropIndicatorComponent indicator={baseIndicator} />,
    );
    await user.hover(document.querySelector("svg") as Element);
    expect(await screen.findByRole("tooltip")).toHaveTextContent(
      "Corporate Usage Analysis",
    );
  });

  test("omits badge and christmas row when unavailable", () => {
    renderWithProviders(
      <BreakDropIndicatorComponent
        indicator={{
          ...baseIndicator,
          corporateUsageLevel: null,
          christmasDropPercentage: null,
        }}
      />,
    );
    expect(screen.queryByText(/Corporate/)).toBeNull();
    expect(screen.queryByText(/Christmas:/)).toBeNull();
    expect(screen.getByText(/Weekend:/)).toBeInTheDocument();
  });
});
