import { renderWithProviders } from "@/test/render";
import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Header from "./header";

describe("Header", () => {
  it("links the logo to the home page", () => {
    renderWithProviders(<Header />);

    const homeLink = screen.getByRole("link", { name: /Package\s*Pulse/ });
    expect(homeLink).toHaveAttribute("href", "/");
    expect(screen.getByRole("banner")).toContainElement(homeLink);
  });

  it("renders the theme switch", async () => {
    renderWithProviders(<Header />);

    expect(
      await screen.findByRole("radio", { name: "Dark" }),
    ).toBeInTheDocument();
  });
});
