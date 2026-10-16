import { QUICK_COMPARISONS } from "@/lib/config/comparison-presets";
import { renderWithProviders } from "@/test/render";
import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import HomeShellFallback from "./home-shell-fallback";

describe("HomeShellFallback", () => {
  it("renders the hero, sections and quick comparison links", () => {
    renderWithProviders(<HomeShellFallback />);

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Compare NPM Package Downloads & Trends",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "How Package Pulse Works" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Perfect for Developers & Teams" }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("link")).toHaveLength(QUICK_COMPARISONS.length);
  });

  it("renders a busy, non-focusable search skeleton", () => {
    const { container } = renderWithProviders(<HomeShellFallback />);

    const busy = container.querySelector('[aria-busy="true"]');
    expect(busy?.firstElementChild).toHaveAttribute("aria-hidden", "true");
    expect(busy?.firstElementChild).toHaveClass("h-9", "w-full");
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    expect(
      screen.getByText(/Tip: You can enter multiple projects/),
    ).toBeInTheDocument();
  });
});
