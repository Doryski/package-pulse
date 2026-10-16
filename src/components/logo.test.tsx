import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Logo from "./logo";

describe("Logo", () => {
  it("renders the brand wordmark with the JS badge", () => {
    render(<Logo />);

    expect(screen.getByText("Package")).toBeInTheDocument();
    expect(screen.getByText("Pulse")).toBeInTheDocument();
    expect(screen.getByText("JS")).toBeInTheDocument();
  });
});
