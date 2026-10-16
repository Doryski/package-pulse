import LocalStorageKey from "@/lib/enums/LocalStorageKey";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import HomeIsland from "./home-island";

const navigationMock = await vi.hoisted(async () => {
  const { createNavigationMock } = await import("@/test/next-navigation");
  return createNavigationMock();
});

vi.mock("next/navigation", () => navigationMock);

vi.mock("@/app/(home)/components/projects-form", async () => {
  const { createElement } = await import("react");
  const { useFormContext, useWatch } = await import("react-hook-form");
  function ProjectsFormStub() {
    const form = useFormContext<{ projects: string[] }>();
    const projects = useWatch({ control: form.control, name: "projects" });
    return createElement(
      "div",
      null,
      createElement(
        "output",
        { "aria-label": "selected projects" },
        JSON.stringify(projects),
      ),
      createElement(
        "button",
        {
          type: "button",
          onClick: () => form.setValue("projects", ["react", "vue"]),
        },
        "select",
      ),
    );
  }
  return { default: ProjectsFormStub };
});

const HERO = <h1>Hero</h1>;
const SECTIONS = <h2>How Package Pulse Works</h2>;
const renderIsland = () => <HomeIsland hero={HERO} sections={SECTIONS} />;

const storeSelection = (projects: string[]) =>
  localStorage.setItem(
    LocalStorageKey.SELECTED_PROJECTS,
    JSON.stringify(projects),
  );

const readStoredSelection = () =>
  JSON.parse(localStorage.getItem(LocalStorageKey.SELECTED_PROJECTS) ?? "null");

const getSelectedProjects = () =>
  JSON.parse(
    screen.getByRole("status", { name: "selected projects" }).textContent ?? "",
  );

const queryHero = () => screen.queryByRole("heading", { name: "Hero" });

beforeEach(() => {
  navigationMock.reset();
});

afterEach(() => {
  localStorage.clear();
});

describe("HomeIsland", () => {
  it("starts from the ?projects= selection and ignores the stored one", () => {
    storeSelection(["zod"]);
    navigationMock.setSearchParams("projects=react,vue");

    render(renderIsland());

    expect(getSelectedProjects()).toEqual(["react", "vue"]);
    expect(queryHero()).not.toBeInTheDocument();
    expect(readStoredSelection()).toEqual(["react", "vue"]);
  });

  it("treats an empty ?projects= as an explicit empty selection", () => {
    storeSelection(["zod"]);
    navigationMock.setSearchParams("projects=");

    render(renderIsland());

    expect(getSelectedProjects()).toEqual([]);
    expect(queryHero()).toBeInTheDocument();
    expect(readStoredSelection()).toEqual([]);
  });

  it("restores the stored selection without a projects param", () => {
    storeSelection(["zod", "yup"]);

    render(renderIsland());

    expect(getSelectedProjects()).toEqual(["zod", "yup"]);
    expect(queryHero()).not.toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "How Package Pulse Works" }),
    ).not.toBeInTheDocument();
    expect(readStoredSelection()).toEqual(["zod", "yup"]);
  });

  it("shows the hero and sections when nothing is stored", () => {
    render(renderIsland());

    expect(getSelectedProjects()).toEqual([]);
    expect(queryHero()).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "How Package Pulse Works" }),
    ).toBeInTheDocument();
  });

  it("keeps the form mounted when the selection updates the URL", async () => {
    storeSelection(["zod"]);
    const user = userEvent.setup();
    const { rerender } = render(renderIsland());

    const selectButton = screen.getByRole("button", { name: "select" });

    await user.click(selectButton);
    navigationMock.setSearchParams("projects=react,vue");
    rerender(renderIsland());

    expect(screen.getByRole("button", { name: "select" })).toBe(selectButton);
    expect(getSelectedProjects()).toEqual(["react", "vue"]);
    expect(readStoredSelection()).toEqual(["react", "vue"]);
  });

  it("restores after hydration without overwriting the stored selection", async () => {
    storeSelection(["zod", "yup"]);
    const container = document.createElement("div");
    container.innerHTML = renderToString(renderIsland());
    document.body.appendChild(container);

    expect(container.textContent).toContain("Hero");

    const root = await act(async () => hydrateRoot(container, renderIsland()));

    expect(getSelectedProjects()).toEqual(["zod", "yup"]);
    expect(queryHero()).not.toBeInTheDocument();
    expect(readStoredSelection()).toEqual(["zod", "yup"]);

    act(() => root.unmount());
    container.remove();
  });
});
