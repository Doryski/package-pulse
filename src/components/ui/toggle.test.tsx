import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test } from "vitest";
import { ToggleGroup, ToggleGroupItem } from "./toggle-group";
import { Toggle } from "./toggle";

describe("Toggle", () => {
  test("toggles pressed state", async () => {
    render(<Toggle aria-label="bold">B</Toggle>);
    const toggle = screen.getByRole("button", { name: "bold" });
    expect(toggle).toHaveAttribute("aria-pressed", "false");
    await userEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-pressed", "true");
  });

  test("applies variant, size and position classes", () => {
    render(
      <Toggle aria-label="t" variant="outline" size="sm" position="first">
        T
      </Toggle>,
    );
    expect(screen.getByRole("button")).toHaveClass(
      "border",
      "h-8",
      "rounded-l-md",
    );
  });
});

describe("ToggleGroup", () => {
  test("selects a single value and positions items", async () => {
    render(
      <ToggleGroup type="single" variant="outline" defaultValue="a">
        <ToggleGroupItem value="a" aria-label="A" />
        <ToggleGroupItem value="b" aria-label="B" />
        <ToggleGroupItem value="c" aria-label="C" />
      </ToggleGroup>,
    );
    const radios = screen.getAllByRole("radio");
    const a = radios[0]!;
    const b = radios[1]!;
    const c = radios[2]!;
    expect(a).toHaveClass("rounded-l-md");
    expect(c).toHaveClass("rounded-r-md");
    expect(a).toBeChecked();
    await userEvent.click(b);
    expect(b).toBeChecked();
    expect(a).not.toBeChecked();
  });

  test("single item gets single position", () => {
    render(
      <ToggleGroup type="single" className="grp">
        <ToggleGroupItem value="a" aria-label="A" className="it" />
      </ToggleGroup>,
    );
    expect(screen.getByRole("radio")).toHaveClass("rounded-md", "it");
  });

  test("item falls back to its own variant and size when group has none", () => {
    render(
      <ToggleGroup type="single">
        <ToggleGroupItem value="a" aria-label="A" variant="outline" size="lg" />
        <ToggleGroupItem value="b" aria-label="B" />
      </ToggleGroup>,
    );
    expect(screen.getAllByRole("radio")[0]).toHaveClass("h-10");
  });
});
