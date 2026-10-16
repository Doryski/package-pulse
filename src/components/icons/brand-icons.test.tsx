import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { GithubIcon, XIcon } from "./brand-icons";

describe.each([
  ["GithubIcon", GithubIcon],
  ["XIcon", XIcon],
])("%s", (_name, Icon) => {
  it("renders a decorative currentColor svg and forwards props", () => {
    const { container } = render(<Icon className="size-4" />);
    const svg = container.querySelector("svg");

    expect(svg).toHaveAttribute("aria-hidden", "true");
    expect(svg).toHaveAttribute("fill", "currentColor");
    expect(svg).toHaveClass("size-4");
    expect(svg?.querySelector("path")?.getAttribute("d")).toBeTruthy();
  });
});
