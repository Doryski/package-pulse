import { createTestQueryClient } from "@/test/render";
import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { ReactNode } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import Home from "./page";

const islandMode = vi.hoisted(() => ({ suspend: false }));

vi.mock("@/app/(home)/components/home-island", () => ({
  default: ({ hero, sections }: { hero: ReactNode; sections: ReactNode }) => {
    if (islandMode.suspend) throw new Promise(() => {});
    return (
      <div data-testid="home-island">
        {hero}
        {sections}
      </div>
    );
  },
}));

const HERO_HEADING = "Compare NPM Package Downloads &amp; Trends";

describe("Home page", () => {
  it("passes the server-rendered hero and sections to the island", () => {
    islandMode.suspend = false;

    render(<Home />);

    const island = screen.getByTestId("home-island");
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Compare NPM Package Downloads & Trends",
      }),
    ).toBeInTheDocument();
    expect(island).toHaveTextContent("How Package Pulse Works");
    expect(island).toHaveTextContent("Perfect for Developers & Teams");
  });

  it("server-renders the hero, sections and quick links while the island bails out", () => {
    islandMode.suspend = true;

    const html = renderToString(
      <QueryClientProvider client={createTestQueryClient()}>
        <Home />
      </QueryClientProvider>,
    );

    expect(html).toMatch(new RegExp(`<h1[^>]*>${HERO_HEADING}</h1>`));
    expect(html).toContain("How Package Pulse Works");
    expect(html).toContain("Perfect for Developers &amp; Teams");
    expect(html).toContain(
      'href="/compare/react-vs-vue-vs-@angular/core-vs-svelte"',
    );
    expect(html).toContain('aria-busy="true"');
    expect(html).not.toContain("<input");
  });
});
