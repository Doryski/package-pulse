import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, test } from "vitest";
import TextLink from "./text-link";

describe("TextLink", () => {
  test("renders a plain link", () => {
    render(<TextLink href="/a">Home</TextLink>);
    const link = screen.getByRole("link", { name: "Home" });
    expect(link).toHaveAttribute("href", "/a");
    expect(link).not.toHaveAttribute("target");
  });

  test("opens outside links in a new tab safely", () => {
    render(
      <TextLink href="https://x.dev" outside>
        Ext
      </TextLink>,
    );
    const link = screen.getByRole("link", { name: "Ext" });
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  test("forwards ref and className", () => {
    const ref = createRef<HTMLAnchorElement>();
    render(
      <TextLink href="/" ref={ref} className="mine">
        L
      </TextLink>,
    );
    expect(ref.current).toHaveClass("mine");
  });
});
