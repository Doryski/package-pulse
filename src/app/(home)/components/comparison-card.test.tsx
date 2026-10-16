import { renderWithProviders } from "@/test/render";
import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ComparisonCard, { ComparisonCardSkeleton } from "./comparison-card";

describe("ComparisonCard", () => {
  it("labels the button with title and projects and calls onProjectsClick on click", async () => {
    const onProjectsClick = vi.fn();
    const { user } = renderWithProviders(
      <ComparisonCard
        projects={["react", "vue"]}
        title="Frameworks"
        onProjectsClick={onProjectsClick}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: "Compare Frameworks: react, vue" }),
    );

    expect(onProjectsClick).toHaveBeenCalledExactlyOnceWith(["react", "vue"]);
    expect(screen.getByText("Press to compare these 2 projects")).toBeTruthy();
  });

  it("selects via keyboard", async () => {
    const onProjectsClick = vi.fn();
    const { user } = renderWithProviders(
      <ComparisonCard
        projects={["react"]}
        title="Solo"
        onProjectsClick={onProjectsClick}
      />,
    );

    await user.tab();
    await user.keyboard("{Enter}");
    await user.keyboard(" ");

    expect(onProjectsClick).toHaveBeenCalledTimes(2);
    expect(screen.getByText("Press to compare this project")).toBeTruthy();
  });

  it("omits the title from the label when empty", () => {
    renderWithProviders(
      <ComparisonCard
        projects={["react", "vue"]}
        title=""
        onProjectsClick={vi.fn()}
        headerExtra={<span>extra</span>}
        className="min-h-52"
      />,
    );

    expect(
      screen.getByRole("button", { name: "Compare react, vue" }),
    ).toBeTruthy();
    expect(screen.getByText("extra")).toBeTruthy();
    expect(screen.getByText("react")).toBeTruthy();
  });
});

describe("ComparisonCardSkeleton", () => {
  it("renders default two badges", () => {
    const { container } = renderWithProviders(<ComparisonCardSkeleton />);
    expect(container.querySelectorAll("[style]")).toHaveLength(2);
  });

  it("renders the requested badge count and class", () => {
    const { container } = renderWithProviders(
      <ComparisonCardSkeleton projectCount={4} className="min-h-52" />,
    );
    expect(container.querySelectorAll("[style]")).toHaveLength(4);
    expect(container.querySelector(".min-h-52")).toBeTruthy();
  });
});
