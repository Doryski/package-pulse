import useFavorites from "@/lib/hooks/useFavorites";
import { renderWithProviders } from "@/test/render";
import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import SavedComparisons from "./saved-comparisons";

vi.mock("@/lib/hooks/useFavorites");

const removeFavorite = vi.fn();

const mockFavorites = (favorites: string[][]) =>
  vi
    .mocked(useFavorites)
    .mockReturnValue({ favorites, removeFavorite } as never);

const onFavoriteRemoved = vi.fn();

beforeEach(() => {
  onFavoriteRemoved.mockClear();
});

describe("SavedComparisons", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders nothing when projects are selected", () => {
    mockFavorites([["react", "vue"]]);
    const { container } = renderWithProviders(
      <SavedComparisons
        selectedProjects={["react"]}
        onAddMultipleProjects={vi.fn()}
        onFavoriteRemoved={onFavoriteRemoved}
      />,
    );
    expect(container.querySelector("section")).toBeNull();
  });

  it("renders nothing without favorites", () => {
    mockFavorites([]);
    renderWithProviders(
      <SavedComparisons
        selectedProjects={[]}
        onAddMultipleProjects={vi.fn()}
        onFavoriteRemoved={onFavoriteRemoved}
      />,
    );
    expect(screen.queryByText("Saved comparisons")).toBeNull();
  });

  it("adds projects when a saved card is clicked", async () => {
    mockFavorites([["react", "vue"], ["zod"]]);
    const onAddMultipleProjects = vi.fn();
    const { user } = renderWithProviders(
      <SavedComparisons
        selectedProjects={[]}
        onAddMultipleProjects={onAddMultipleProjects}
        onFavoriteRemoved={onFavoriteRemoved}
      />,
    );

    expect(screen.getByText("Saved comparisons")).toBeTruthy();
    await user.click(
      screen.getByRole("button", { name: "Compare react, vue: react, vue" }),
    );

    expect(onAddMultipleProjects).toHaveBeenCalledExactlyOnceWith([
      "react",
      "vue",
    ]);
  });

  it("removes a favorite without selecting it", async () => {
    mockFavorites([["react", "vue"]]);
    const onAddMultipleProjects = vi.fn();
    const { user } = renderWithProviders(
      <SavedComparisons
        selectedProjects={[]}
        onAddMultipleProjects={onAddMultipleProjects}
        onFavoriteRemoved={onFavoriteRemoved}
      />,
    );

    await user.click(
      screen.getByRole("button", {
        name: "Remove saved comparison react, vue",
      }),
    );

    expect(removeFavorite).toHaveBeenCalledExactlyOnceWith(["react", "vue"]);
    expect(onFavoriteRemoved).toHaveBeenCalledOnce();
    expect(onAddMultipleProjects).not.toHaveBeenCalled();
  });
});
