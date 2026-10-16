import useLatestComparisons from "@/lib/queries/useLatestComparisons";
import { buildGlobalComparison } from "@/test/factories";
import { renderWithProviders } from "@/test/render";
import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import LatestComparisons from "./latest-comparisons";

vi.mock("@/lib/queries/useLatestComparisons");

const mockQuery = (query: object) =>
  vi.mocked(useLatestComparisons).mockReturnValue(query as never);

const comparisons = [
  buildGlobalComparison({ id: "a", projects: ["react", "vue"] }),
  buildGlobalComparison({ id: "b", projects: ["zod"] }),
  buildGlobalComparison({ id: "c", projects: [] }),
];

describe("LatestComparisons", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders nothing when projects are selected", () => {
    mockQuery({ data: { comparisons } });
    const { container } = renderWithProviders(
      <LatestComparisons
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
      <LatestComparisons
        selectedProjects={[]}
        onAddMultipleProjects={vi.fn()}
      />,
    );
    expect(container.querySelector("section")).toBeNull();
  });

  it("renders skeletons while loading", () => {
    mockQuery({ isLoading: true, data: { comparisons } });
    renderWithProviders(
      <LatestComparisons
        selectedProjects={[]}
        onAddMultipleProjects={vi.fn()}
      />,
    );
    expect(screen.queryAllByRole("button")).toHaveLength(0);
    expect(document.querySelectorAll(".animate-pulse")).toHaveLength(6);
  });

  it("adds projects on click and ignores empty comparisons", async () => {
    mockQuery({ isLoading: false, data: { comparisons } });
    const onAddMultipleProjects = vi.fn();
    const { user } = renderWithProviders(
      <LatestComparisons
        selectedProjects={[]}
        onAddMultipleProjects={onAddMultipleProjects}
      />,
    );

    expect(screen.getByText("Latest Searches or Comparisons")).toBeTruthy();
    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(3);

    await user.click(
      screen.getByRole("button", { name: "Compare react, vue" }),
    );
    expect(onAddMultipleProjects).toHaveBeenCalledExactlyOnceWith([
      "react",
      "vue",
    ]);

    onAddMultipleProjects.mockClear();
    await user.click(buttons[2]!);
    expect(onAddMultipleProjects).not.toHaveBeenCalled();
  });
});
