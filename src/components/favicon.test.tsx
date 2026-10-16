import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Favicon from "./favicon";

describe("Favicon", () => {
  it("renders the package pulse svg image", () => {
    render(<Favicon />);

    const image = screen.getByRole("img", { name: "Favicon" });
    expect(image).toHaveAttribute("width", "100");
    expect(image).toHaveAttribute("height", "100");
    expect(image.getAttribute("src")).toContain("package-pulse.svg");
  });
});
