import useSimilarProjects from "@/lib/queries/useSimilarProjects";
import { renderWithProviders } from "@/test/render";
import { screen } from "@testing-library/react";
import { ReactNode } from "react";
import { toast } from "sonner";
import { beforeEach, describe, expect, it, vi } from "vitest";
import SimilarProjects from "./similar-projects";

vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));
vi.mock("@/lib/queries/useSimilarProjects");
vi.mock("@/components/ui/button", () => ({
  Button: ({
    disabled,
    children,
    onClick,
  }: {
    disabled?: boolean;
    children: ReactNode;
    onClick: () => void;
  }) => (
    <button type="button" data-disabled={disabled} onClick={onClick}>
      {children}
    </button>
  ),
}));

const mockQuery = (query: object) =>
  vi.mocked(useSimilarProjects).mockReturnValue(query as never);

const tenProjects = Array.from({ length: 10 }, (_, index) => `pkg-${index}`);

describe("SimilarProjects", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders nothing without a selection", () => {
    mockQuery({ data: ["vue"] });
    const { container } = renderWithProviders(
      <SimilarProjects selectedProjects={[]} onAddProject={vi.fn()} />,
    );
    expect(container.querySelector("section")).toBeNull();
  });

  it("renders nothing on error", () => {
    mockQuery({ isError: true });
    const { container } = renderWithProviders(
      <SimilarProjects selectedProjects={["react"]} onAddProject={vi.fn()} />,
    );
    expect(container.querySelector("section")).toBeNull();
  });

  it("shows skeletons while loading", () => {
    mockQuery({ isLoading: true, data: undefined });
    const { container } = renderWithProviders(
      <SimilarProjects selectedProjects={["react"]} onAddProject={vi.fn()} />,
    );
    const skeletonList = screen.getByTestId("similar-projects-skeleton");
    expect(skeletonList.tagName).toBe("UL");
    expect(skeletonList).toHaveAttribute("aria-hidden", "true");
    const items = [...skeletonList.children];
    expect(items).toHaveLength(5);
    items.forEach((item) => {
      expect(item.tagName).toBe("LI");
      expect(item.firstElementChild).toHaveClass(
        "h-8",
        "motion-safe:animate-pulse",
      );
    });
    expect(container.querySelector("section")).toHaveAttribute(
      "aria-busy",
      "true",
    );
    expect(
      screen.getByRole("heading", { name: "Similar projects" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("No similar projects found.")).toBeNull();
  });

  it("reserves the button row height and clears busy state once loaded", () => {
    mockQuery({ isLoading: false, data: ["vue"] });
    const { container } = renderWithProviders(
      <SimilarProjects selectedProjects={["react"]} onAddProject={vi.fn()} />,
    );
    const section = container.querySelector("section");
    expect(section).not.toHaveAttribute("aria-busy");
    expect(section?.querySelector("h2")?.nextElementSibling).toHaveClass(
      "min-h-8",
    );
    expect(screen.queryByTestId("similar-projects-skeleton")).toBeNull();
  });

  it("shows the empty message when nothing is left", () => {
    mockQuery({ isLoading: false, data: ["react"] });
    renderWithProviders(
      <SimilarProjects selectedProjects={["react"]} onAddProject={vi.fn()} />,
    );
    expect(screen.getByText("No similar projects found.")).toBeTruthy();
  });

  it("shows the empty message when data is missing", () => {
    mockQuery({ isLoading: false, data: undefined });
    renderWithProviders(
      <SimilarProjects selectedProjects={["react"]} onAddProject={vi.fn()} />,
    );
    expect(screen.getByText("No similar projects found.")).toBeTruthy();
  });

  it("adds a project and removes it from suggestions", async () => {
    mockQuery({ isLoading: false, data: ["react", "vue", "svelte"] });
    const onAddProject = vi.fn();
    const { user } = renderWithProviders(
      <SimilarProjects
        selectedProjects={["react"]}
        onAddProject={onAddProject}
      />,
    );

    expect(screen.queryByRole("button", { name: "react" })).toBeNull();
    await user.click(screen.getByRole("button", { name: "vue" }));

    expect(onAddProject).toHaveBeenCalledExactlyOnceWith("vue");
    expect(screen.queryByRole("button", { name: "vue" })).toBeNull();
    expect(screen.getByRole("button", { name: "svelte" })).toBeTruthy();
  });

  it("disables buttons while refetching", () => {
    mockQuery({ isLoading: true, data: ["vue"] });
    renderWithProviders(
      <SimilarProjects selectedProjects={["react"]} onAddProject={vi.fn()} />,
    );
    expect(screen.getByRole("button", { name: "vue" }).dataset.disabled).toBe(
      "true",
    );
  });

  it("disables buttons at the selection limit and does not add", async () => {
    mockQuery({ isLoading: false, data: ["vue"] });
    const onAddProject = vi.fn();
    const { user } = renderWithProviders(
      <SimilarProjects
        selectedProjects={tenProjects}
        onAddProject={onAddProject}
      />,
    );

    const button = screen.getByRole("button", { name: "vue" });
    expect(button.dataset.disabled).toBe("true");
    await user.click(button);
    expect(onAddProject).not.toHaveBeenCalled();
  });

  it("toasts and skips adding when the limit is reached on click", async () => {
    mockQuery({ isLoading: false, data: ["vue"] });
    const onAddProject = vi.fn();
    const { user } = renderWithProviders(
      <SimilarProjects
        selectedProjects={tenProjects}
        onAddProject={onAddProject}
      />,
    );

    await user.click(screen.getByRole("button", { name: "vue" }));

    expect(toast.error).toHaveBeenCalledWith(
      "You can select a maximum of 10 projects",
    );
    expect(onAddProject).not.toHaveBeenCalled();
  });

  it("resets removed suggestions after the selection is cleared", async () => {
    mockQuery({ isLoading: false, data: ["vue", "svelte"] });
    const { user, rerender } = renderWithProviders(
      <SimilarProjects selectedProjects={["react"]} onAddProject={vi.fn()} />,
    );
    await user.click(screen.getByRole("button", { name: "vue" }));
    expect(screen.queryByRole("button", { name: "vue" })).toBeNull();

    rerender(<SimilarProjects selectedProjects={[]} onAddProject={vi.fn()} />);
    rerender(
      <SimilarProjects selectedProjects={["react"]} onAddProject={vi.fn()} />,
    );

    expect(screen.getByRole("button", { name: "vue" })).toBeTruthy();
  });
});
