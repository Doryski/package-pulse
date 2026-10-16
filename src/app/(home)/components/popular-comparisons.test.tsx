import usePopularComparisons from "@/lib/queries/usePopularComparisons";
import { renderWithProviders } from "@/test/render";
import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import PopularComparisons from "./popular-comparisons";

vi.mock("@/lib/queries/usePopularComparisons");

const mockQuery = (query: object) =>
  vi.mocked(usePopularComparisons).mockReturnValue(query as never);

const comparisons = [
  {
    projects: ["react", "vue"],
    count: 25,
    lastUsed: 1,
    averageProjectsCount: 2,
  },
  { projects: ["zod"], count: 1, lastUsed: 1, averageProjectsCount: 1 },
];

describe("PopularComparisons", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders nothing when projects are selected", () => {
    mockQuery({ data: { comparisons } });
    const { container } = renderWithProviders(
      <PopularComparisons
        selectedProjects={["react"]}
        onAddMultipleProjects={vi.fn()}
      />,
    );
    expect(container.querySelector("section")).toBeNull();
  });

  it.each([
    ["error", { error: new Error("x"), data: { comparisons } }],
    ["no data", { data: undefined }],
    ["empty", { data: { comparisons: [] } }],
  ])("is hidden on %s", (_, query) => {
    mockQuery(query);
    const { container } = renderWithProviders(
      <PopularComparisons
        selectedProjects={[]}
        onAddMultipleProjects={vi.fn()}
      />,
    );
    expect(container.querySelector("section")).toBeNull();
  });

  it("renders skeletons while loading", () => {
    mockQuery({ isLoading: true, data: undefined });
    renderWithProviders(
      <PopularComparisons
        selectedProjects={[]}
        onAddMultipleProjects={vi.fn()}
      />,
    );
    expect(screen.queryAllByRole("button")).toHaveLength(0);
    expect(
      screen.getByRole("heading", { name: "Popular Searches or Comparisons" }),
    ).toBeInTheDocument();
    expect(document.querySelector("section")).toHaveAttribute(
      "aria-busy",
      "true",
    );
    const skeletons = document.querySelectorAll(".motion-safe\\:animate-pulse");
    expect(skeletons).toHaveLength(6);
    expect(skeletons[0]?.parentElement).toHaveAttribute("aria-hidden", "true");
  });

  it("renders nothing while loading when projects are selected", () => {
    mockQuery({ isLoading: true, data: undefined });
    const { container } = renderWithProviders(
      <PopularComparisons
        selectedProjects={["react"]}
        onAddMultipleProjects={vi.fn()}
      />,
    );
    expect(container.querySelector("section")).toBeNull();
  });

  it.each([
    ["nothing is selected", [], true],
    ["projects are selected", ["react"], false],
  ])("enables the feed query only when %s", (_, selectedProjects, enabled) => {
    mockQuery({ data: undefined });
    renderWithProviders(
      <PopularComparisons
        selectedProjects={selectedProjects}
        onAddMultipleProjects={vi.fn()}
      />,
    );
    expect(usePopularComparisons).toHaveBeenLastCalledWith({ enabled });
  });

  it("adds projects on click", async () => {
    mockQuery({ isLoading: false, data: { comparisons } });
    const onAddMultipleProjects = vi.fn();
    const { user } = renderWithProviders(
      <PopularComparisons
        selectedProjects={[]}
        onAddMultipleProjects={onAddMultipleProjects}
      />,
    );

    expect(screen.getByText("Popular Searches or Comparisons")).toBeTruthy();
    expect(screen.getAllByRole("button")).toHaveLength(2);
    await user.click(
      screen.getByRole("button", { name: "Compare react, vue" }),
    );

    expect(onAddMultipleProjects).toHaveBeenCalledExactlyOnceWith([
      "react",
      "vue",
    ]);
  });
});
