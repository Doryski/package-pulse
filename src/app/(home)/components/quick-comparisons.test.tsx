import { QUICK_COMPARISONS } from "@/lib/config/comparison-presets";
import { renderWithProviders } from "@/test/render";
import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import QuickComparisons from "./quick-comparisons";

describe("QuickComparisons", () => {
  it("renders nothing when projects are selected", () => {
    const { container } = renderWithProviders(
      <QuickComparisons
        selectedProjects={["react"]}
        onAddMultipleProjects={vi.fn()}
      />,
    );
    expect(container.querySelector("section")).toBeNull();
  });

  it("renders a card per preset", () => {
    renderWithProviders(
      <QuickComparisons
        selectedProjects={[]}
        onAddMultipleProjects={vi.fn()}
      />,
    );
    expect(screen.getByText("Quick Comparisons")).toBeTruthy();
    expect(screen.getAllByRole("button")).toHaveLength(
      QUICK_COMPARISONS.length,
    );
  });

  it("adds a preset's projects on click", async () => {
    const onAddMultipleProjects = vi.fn();
    const [first] = QUICK_COMPARISONS;
    const { user } = renderWithProviders(
      <QuickComparisons
        selectedProjects={[]}
        onAddMultipleProjects={onAddMultipleProjects}
      />,
    );

    await user.click(
      screen.getByRole("button", {
        name: `Compare ${first.title}: ${first.projects.join(", ")}`,
      }),
    );

    expect(onAddMultipleProjects).toHaveBeenCalledExactlyOnceWith([
      ...first.projects,
    ]);
  });
});
