import { QUICK_COMPARISONS } from "@/lib/config/comparison-presets";
import { renderWithProviders } from "@/test/render";
import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { projectsToComparePath } from "@/lib/utils/slug";
import QuickComparisons, { QuickComparisonLinks } from "./quick-comparisons";

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

describe("QuickComparisonLinks", () => {
  it("renders a compare link per preset without buttons", () => {
    renderWithProviders(<QuickComparisonLinks />);

    expect(
      screen.getByRole("heading", { name: "Quick Comparisons" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    QUICK_COMPARISONS.forEach(({ title, projects }) => {
      expect(
        screen.getByRole("link", {
          name: `Compare ${title}: ${projects.join(", ")}`,
        }),
      ).toHaveAttribute("href", projectsToComparePath([...projects]));
    });
  });
});
