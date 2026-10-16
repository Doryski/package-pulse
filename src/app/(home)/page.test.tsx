import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Home from "./page";

const navigationMock = await vi.hoisted(async () => {
  const { createNavigationMock } = await import("@/test/next-navigation");
  return createNavigationMock();
});

vi.mock("next/navigation", () => navigationMock);

vi.mock("@/app/(home)/components/home-shell", () => ({
  default: ({ initialProjects }: { initialProjects: string[] }) => (
    <output aria-label="home shell">{JSON.stringify(initialProjects)}</output>
  ),
}));

const getShellProjects = () =>
  JSON.parse(
    screen.getByRole("status", { name: "home shell" }).textContent ?? "",
  );

beforeEach(() => {
  navigationMock.reset();
});

describe("Home page", () => {
  it("passes projects from the search params to the home shell", () => {
    navigationMock.setSearchParams("projects=react,vue");

    render(<Home />);

    expect(getShellProjects()).toEqual(["react", "vue"]);
  });

  it("passes an empty list without the projects param", () => {
    render(<Home />);

    expect(getShellProjects()).toEqual([]);
  });
});
