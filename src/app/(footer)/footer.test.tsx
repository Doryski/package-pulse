import { links } from "@/lib/config/constants";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Footer from "./footer";

const EXTERNAL_LINKS = [
  { name: /Doryski/, href: links.githubProfile },
  { name: /dominikrycharski\.com/, href: links.personalWebsite },
  { name: /GitHub repository/, href: links.githubRepository },
] as const;

describe("Footer", () => {
  it("renders the author credit", () => {
    render(<Footer />);

    expect(screen.getByRole("contentinfo")).toHaveTextContent(
      "Developed by Dominik Rycharski",
    );
  });

  it.each(EXTERNAL_LINKS)(
    "opens $href in a new tab safely",
    ({ name, href }) => {
      render(<Footer />);

      const link = screen.getByRole("link", { name });
      expect(link).toHaveAttribute("href", href);
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", "noopener noreferrer");
    },
  );

  it("renders exactly the configured external links", () => {
    render(<Footer />);

    expect(screen.getAllByRole("link")).toHaveLength(EXTERNAL_LINKS.length);
  });
});
