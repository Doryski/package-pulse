import { render } from "@testing-library/react";
import { ThemeProvider } from "next-themes";
import { describe, expect, test } from "vitest";
import DotIndicator from "./dot-indicator";

const renderDot = (ui: React.ReactElement) =>
  render(<ThemeProvider attribute="class">{ui}</ThemeProvider>);

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

  test("resolves chart color from index and theme", () => {
    const { container } = renderDot(<DotIndicator index={0} />);
    expect(container.querySelector("span")).toBeInTheDocument();
  });
});
