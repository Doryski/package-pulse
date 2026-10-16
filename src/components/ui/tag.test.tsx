import { screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import { renderWithProviders } from "@/test/render";
import Tag from "./tag";

describe("Tag", () => {
  test("renders children and calls onRemove", async () => {
    const onRemove = vi.fn();
    const { user } = renderWithProviders(
      <Tag onRemove={onRemove} removeLabel="Remove react">
        react
      </Tag>,
    );
    expect(screen.getByText("react")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Remove react" }));
    expect(onRemove).toHaveBeenCalledOnce();
  });

  test("shows custom tooltip content on hover", async () => {
    const { user } = renderWithProviders(
      <Tag
        onRemove={vi.fn()}
        removeLabel="Remove"
        tooltipContent="Custom tip"
        className="extra"
        data-testid="tag"
      >
        x
      </Tag>,
    );
    expect(screen.getByTestId("tag")).toHaveClass("extra");
    await user.hover(screen.getByRole("button", { name: "Remove" }));
    expect(await screen.findByRole("tooltip")).toHaveTextContent("Custom tip");
  });

  test("falls back to removeLabel as tooltip", async () => {
    const { user } = renderWithProviders(
      <Tag onRemove={vi.fn()} removeLabel="Remove me">
        x
      </Tag>,
    );
    await user.hover(screen.getByRole("button", { name: "Remove me" }));
    expect(await screen.findByRole("tooltip")).toHaveTextContent("Remove me");
  });
});
