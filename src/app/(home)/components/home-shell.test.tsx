import LocalStorageKey from "@/lib/enums/LocalStorageKey";
import { renderWithProviders } from "@/test/render";
import { screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import HomeShell from "./home-shell";

vi.mock("@/app/(home)/components/projects-form", async () => {
  const { createElement } = await import("react");
  const { useFormContext } = await import("react-hook-form");
  function ProjectsFormStub() {
    const form = useFormContext<{ projects: string[] }>();
    return createElement(
      "div",
      { "data-testid": "projects-form" },
      createElement(
        "button",
        {
          type: "button",
          onClick: () => form.setValue("projects", ["react", "vue"]),
        },
        "select",
      ),
      createElement(
        "button",
        { type: "button", onClick: () => form.setValue("projects", []) },
        "clear",
      ),
    );
  }
  return { default: ProjectsFormStub };
});

const HERO_HEADING = "Compare NPM Package Downloads & Trends";
const HOW_IT_WORKS_HEADING = "How Package Pulse Works";

const readStoredSelection = () =>
  localStorage.getItem(LocalStorageKey.SELECTED_PROJECTS);

afterEach(() => {
  localStorage.clear();
});

describe("HomeShell", { timeout: 15_000 }, () => {
  it("shows the hero and How it works sections in the empty state", () => {
    renderWithProviders(<HomeShell initialProjects={[]} />);

    expect(
      screen.getByRole("heading", { level: 1, name: HERO_HEADING }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: HOW_IT_WORKS_HEADING }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Perfect for Developers & Teams" }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("projects-form")).toBeInTheDocument();
  });

  it("hides the marketing sections when projects are selected", () => {
    renderWithProviders(<HomeShell initialProjects={["react"]} />);

    expect(
      screen.queryByRole("heading", { name: HERO_HEADING }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: HOW_IT_WORKS_HEADING }),
    ).not.toBeInTheDocument();
    expect(screen.getByTestId("projects-form")).toBeInTheDocument();
  });

  it("toggles between empty and active states as the selection changes", async () => {
    const { user } = renderWithProviders(<HomeShell initialProjects={[]} />);

    await user.click(screen.getByRole("button", { name: "select" }));
    expect(
      screen.queryByRole("heading", { name: HERO_HEADING }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "clear" }));
    expect(
      screen.getByRole("heading", { name: HERO_HEADING }),
    ).toBeInTheDocument();
  });

  it("persists the selection to localStorage by default", async () => {
    const { user } = renderWithProviders(
      <HomeShell initialProjects={["react"]} />,
    );

    expect(readStoredSelection()).toBe(JSON.stringify(["react"]));

    await user.click(screen.getByRole("button", { name: "select" }));
    expect(readStoredSelection()).toBe(JSON.stringify(["react", "vue"]));
  });

  it("does not write the selection when persistSelection is false", async () => {
    const { user } = renderWithProviders(
      <HomeShell initialProjects={["react"]} persistSelection={false} />,
    );

    await user.click(screen.getByRole("button", { name: "select" }));

    expect(readStoredSelection()).toBeNull();
  });
});
