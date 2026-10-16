import { colors } from "@/lib/theme/colors";
import { renderWithProviders } from "@/test/render";
import { screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import ProjectTag from "./project-tag";

const normalizeBorder = (color: string) => {
  const probe = document.createElement("div");
  probe.style.border = `2px solid ${color}`;
  return probe.style.border;
};

const renderTag = (error?: { type: string; message: string }) => {
  const onRemove = vi.fn();
  const result = renderWithProviders(
    <ProjectTag
      project="react"
      colorIndex={1}
      error={error}
      onRemove={onRemove}
    />,
  );
  return { ...result, onRemove };
};

afterEach(() => {
  localStorage.clear();
});

describe("ProjectTag", { timeout: 15_000 }, () => {
  it("renders the project as a list item bordered with the light theme color", () => {
    renderTag();

    const tag = screen.getByRole("listitem");
    expect(tag).toHaveTextContent("react");
    expect(tag.style.border).toBe(normalizeBorder(colors.chart.light[2]));
    expect(tag.style.border).not.toBe(normalizeBorder(colors.chart.dark[2]));
    expect(tag.style.backgroundColor).toBe("");
  });

  it("uses the dark theme color when the dark theme is active", () => {
    localStorage.setItem("theme", "dark");
    renderTag();

    expect(screen.getByRole("listitem").style.border).toBe(
      normalizeBorder(colors.chart.dark[2]),
    );
  });

  it("switches to error styling when a field error is set", () => {
    renderTag({ type: "custom", message: "Not found" });

    const tag = screen.getByRole("listitem");
    expect(tag.style.border).toBe(normalizeBorder("red"));
    expect(tag.style.backgroundColor).toBe("rgba(255, 0, 0, 0.25)");
  });

  it("calls onRemove from the labelled remove button", async () => {
    const { user, onRemove } = renderTag();

    await user.click(screen.getByRole("button", { name: "Remove react" }));

    expect(onRemove).toHaveBeenCalledOnce();
  });
});
