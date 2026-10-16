import { render, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { describe, expect, test } from "vitest";
import ArrowIndicator from "./arrow-indicator";
import ClientOnly from "./client-only";
import Dash from "./dash";
import PulsatingDotIndicator from "./PulsatingDotIndicator";

describe("ArrowIndicator", () => {
  test("renders nothing when value is undefined", () => {
    const { container } = render(<ArrowIndicator value={undefined} />);
    expect(container).toBeEmptyDOMElement();
  });

  test("renders green up arrow for positive value", () => {
    render(<ArrowIndicator value={5} />);
    expect(screen.getByText("↑")).toHaveClass("text-green-700");
  });

  test("renders red down arrow for negative value", () => {
    render(<ArrowIndicator value={-5} />);
    expect(screen.getByText("↓")).toHaveClass("text-red-700");
  });

  test("renders red down arrow for zero", () => {
    render(<ArrowIndicator value={0} />);
    expect(screen.getByText("↓")).toBeInTheDocument();
  });
});

describe("ClientOnly", () => {
  test("renders children on the client", () => {
    render(
      <ClientOnly>
        <span>mounted</span>
      </ClientOnly>,
    );
    expect(screen.getByText("mounted")).toBeInTheDocument();
  });

  test("renders nothing during server rendering", () => {
    expect(
      renderToString(
        <ClientOnly>
          <span>mounted</span>
        </ClientOnly>,
      ),
    ).toBe("");
  });

  test("renders the fallback during server rendering", () => {
    expect(
      renderToString(
        <ClientOnly fallback={<span>placeholder</span>}>
          <span>mounted</span>
        </ClientOnly>,
      ),
    ).toBe("<span>placeholder</span>");
  });
});

describe("Dash", () => {
  test("forwards props to the div", () => {
    render(<Dash data-testid="dash" style={{ color: "red" }} />);
    expect(screen.getByTestId("dash")).toHaveStyle({ color: "rgb(255, 0, 0)" });
  });
});

describe("PulsatingDotIndicator", () => {
  test("renders pulse and ring when active by default", () => {
    const { container } = render(<PulsatingDotIndicator color="red" />);
    expect(container.querySelector(".animate-pulse-dot")).toBeInTheDocument();
    expect(container.querySelector(".animate-pulse-ring")).toBeInTheDocument();
  });

  test("stops pulsing under prefers-reduced-motion", () => {
    const { container } = render(<PulsatingDotIndicator color="red" />);
    expect(container.querySelector(".animate-pulse-dot")).toHaveClass(
      "motion-reduce:animate-none",
    );
    expect(container.querySelector(".animate-pulse-ring")).toHaveClass(
      "motion-reduce:animate-none",
    );
  });

  test("renders static dot when inactive", () => {
    const { container } = render(
      <PulsatingDotIndicator color="blue" active={false} />,
    );
    expect(container.querySelector(".animate-pulse-dot")).toBeNull();
    expect(container.querySelector(".animate-pulse-ring")).toBeNull();
  });
});
