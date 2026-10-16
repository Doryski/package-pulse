import LocalStorageKey from "@/lib/enums/LocalStorageKey";
import { renderWithProviders } from "@/test/render";
import { screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ComponentProps } from "react";
import HomeHero from "./home-hero";
import HomeSections from "./home-sections";
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

const renderShell = (props: ComponentProps<typeof HomeShell>) =>
  renderWithProviders(
    <HomeShell hero={<HomeHero />} sections={<HomeSections />} {...props} />,
  );

const readStoredSelection = () =>
  localStorage.getItem(LocalStorageKey.SELECTED_PROJECTS);

afterEach(() => {
  localStorage.clear();
});

describe("HomeShell", { timeout: 15_000 }, () => {
  it("shows the hero and How it works sections in the empty state", () => {
    renderShell({ initialProjects: [] });

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
    renderShell({ initialProjects: ["react"] });

    expect(
      screen.queryByRole("heading", { name: HERO_HEADING }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: HOW_IT_WORKS_HEADING }),
    ).not.toBeInTheDocument();
    expect(screen.getByTestId("projects-form")).toBeInTheDocument();
  });

  it("toggles between empty and active states as the selection changes", async () => {
    const { user } = renderShell({ initialProjects: [] });

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
    const { user } = renderShell({ initialProjects: ["react"] });

    expect(readStoredSelection()).toBe(JSON.stringify(["react"]));

    await user.click(screen.getByRole("button", { name: "select" }));
    expect(readStoredSelection()).toBe(JSON.stringify(["react", "vue"]));
  });

  it("does not write the selection when persistSelection is false", async () => {
    const { user } = renderShell({
      initialProjects: ["react"],
      persistSelection: false,
    });

    await user.click(screen.getByRole("button", { name: "select" }));

    expect(readStoredSelection()).toBeNull();
  });

  it("does not overwrite a stored selection before restore, then writes changes", async () => {
    localStorage.setItem(
      LocalStorageKey.SELECTED_PROJECTS,
      JSON.stringify(["zod"]),
    );
    const { rerender, user } = renderShell({
      initialProjects: [],
      persistSelection: false,
    });

    expect(readStoredSelection()).toBe(JSON.stringify(["zod"]));

    rerender(<HomeShell key="restored" initialProjects={["zod"]} />);
    expect(readStoredSelection()).toBe(JSON.stringify(["zod"]));

    await user.click(screen.getByRole("button", { name: "select" }));
    expect(readStoredSelection()).toBe(JSON.stringify(["react", "vue"]));
  });

  it("renders the selection heading from the live selection", async () => {
    const { user } = renderWithProviders(
      <HomeShell initialProjects={["react"]} selectionHeading />,
    );

    expect(
      screen.getByRole("heading", { level: 1, name: "react npm downloads" }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "select" }));
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "react vs vue npm downloads",
      }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "clear" }));
    expect(screen.queryByRole("heading", { level: 1 })).not.toBeInTheDocument();
    expect(screen.getByTestId("projects-form")).toBeInTheDocument();
  });

  it("does not render a selection heading by default", () => {
    renderWithProviders(<HomeShell initialProjects={["react"]} />);

    expect(screen.queryByRole("heading", { level: 1 })).not.toBeInTheDocument();
  });

  it("renders only the form without hero and sections slots", () => {
    renderWithProviders(<HomeShell initialProjects={[]} />);

    expect(
      screen.queryByRole("heading", { name: HERO_HEADING }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: HOW_IT_WORKS_HEADING }),
    ).not.toBeInTheDocument();
    expect(screen.getByTestId("projects-form")).toBeInTheDocument();
  });
});
