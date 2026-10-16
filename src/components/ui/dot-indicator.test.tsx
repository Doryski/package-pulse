import { render } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import DotIndicator from "./dot-indicator";

const renderDot = (ui: React.ReactElement) => render(ui);

describe("DotIndicator", () => {
  test("uses explicit color", () => {
    const { container } = renderDot(<DotIndicator color="red" />);
    expect(container.querySelector("span")).toHaveStyle({
      backgroundColor: "rgb(255, 0, 0)",
    });
  });

  test("renders without background when color is undefined", () => {
    const { container } = renderDot(
      <DotIndicator color={undefined} className="custom" />,
    );
    const dot = container.querySelector("span");
    expect(dot).toHaveClass("custom");
    expect(dot?.style.backgroundColor).toBe("");
  });

  test("resolves a theme-independent chart CSS variable from the index", () => {
    const { container } = renderDot(<DotIndicator index={2} />);
    expect(container.querySelector("span")?.getAttribute("style")).toContain(
      "hsl(var(--chart-3))",
    );
  });
});
