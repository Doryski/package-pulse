import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Loading from "./loading";

describe("Loading", () => {
  it("renders a pulsing favicon", () => {
    render(<Loading />);

    const image = screen.getByRole("img", { name: "Favicon" });
    expect(image.parentElement).toHaveClass("animate-pulse");
  });
});
