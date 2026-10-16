import { createTestQueryClient, renderWithProviders } from "@/test/render";
import { QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ComparisonCard, { ComparisonCardSkeleton } from "./comparison-card";

const loadDownloads = vi.hoisted(() =>
  vi.fn(() => new Promise<never>(() => {})),
);

vi.mock("@/api/downloadsLoader", () => ({ default: loadDownloads }));

afterEach(() => {
  loadDownloads.mockClear();
});

describe("ComparisonCard", () => {
  it("labels the button with title and projects and calls onProjectsClick on click", async () => {
    const onProjectsClick = vi.fn();
    const { user } = renderWithProviders(
      <ComparisonCard
        projects={["react", "vue"]}
        title="Frameworks"
        onProjectsClick={onProjectsClick}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: "Compare Frameworks: react, vue" }),
    );

    expect(onProjectsClick).toHaveBeenCalledExactlyOnceWith(["react", "vue"]);
    expect(screen.getByText("Press to compare these 2 projects")).toBeTruthy();
  });

  it("selects via keyboard", async () => {
    const onProjectsClick = vi.fn();
    const { user } = renderWithProviders(
      <ComparisonCard
        projects={["react"]}
        title="Solo"
        onProjectsClick={onProjectsClick}
      />,
    );

    await user.tab();
    await user.keyboard("{Enter}");
    await user.keyboard(" ");

    expect(onProjectsClick).toHaveBeenCalledTimes(2);
    expect(screen.getByText("Press to compare this project")).toBeTruthy();
  });

  it("omits the title from the label when empty", () => {
    renderWithProviders(
      <ComparisonCard
        projects={["react", "vue"]}
        title=""
        onProjectsClick={vi.fn()}
        headerExtra={<span>extra</span>}
        className="min-h-52"
      />,
    );

    expect(
      screen.getByRole("button", { name: "Compare react, vue" }),
    ).toBeTruthy();
    expect(screen.getByText("extra")).toBeTruthy();
    expect(screen.getByText("react")).toBeTruthy();
  });
});

describe("ComparisonCard link variant", () => {
  it("renders the action as a labelled link to the href", () => {
    renderWithProviders(
      <ComparisonCard
        projects={["react", "vue"]}
        title="Frameworks"
        href="/compare/react-vs-vue"
      />,
    );

    expect(
      screen.getByRole("link", { name: "Compare Frameworks: react, vue" }),
    ).toHaveAttribute("href", "/compare/react-vs-vue");
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});

describe("ComparisonCard server render", () => {
  it("renders a colour dot per project in the initial HTML", () => {
    const container = document.createElement("div");
    container.innerHTML = renderToString(
      <QueryClientProvider client={createTestQueryClient()}>
        <ComparisonCard
          projects={["react", "vue"]}
          title="Frameworks"
          href="/compare/react-vs-vue"
        />
      </QueryClientProvider>,
    );

    const dots = [...container.querySelectorAll("span.rounded-full")];
    expect(dots.map((dot) => dot.getAttribute("style"))).toEqual([
      "background-color:hsl(var(--chart-1))",
      "background-color:hsl(var(--chart-2))",
    ]);
  });
});

describe("ComparisonCard upstream traffic", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const renderCards = () =>
    renderWithProviders(
      <>
        <ComparisonCard
          projects={["react", "vue"]}
          title="Frameworks"
          href="/compare/react-vs-vue"
        />
        <ComparisonCard
          projects={["@angular/core", "svelte"]}
          title="More frameworks"
          onProjectsClick={vi.fn()}
        />
      </>,
    );

  const getCards = () =>
    screen
      .getAllByRole("link")
      .concat(screen.getAllByRole("button"))
      .map((action) => action.closest<HTMLElement>(".rounded-xl")!);

  it.each([
    [
      "hovering",
      (card: HTMLElement) => {
        fireEvent.pointerEnter(card);
      },
    ],
    [
      "focusing",
      (card: HTMLElement) => {
        fireEvent.focus(card);
      },
    ],
    [
      "sweeping the pointer over",
      (card: HTMLElement) => {
        fireEvent.pointerEnter(card);
        fireEvent.pointerMove(card);
        fireEvent.pointerLeave(card);
      },
    ],
  ])("does not load downloads when %s cards", (_, interact) => {
    const { queryClient } = renderCards();
    const prefetchSpy = vi.spyOn(queryClient, "prefetchQuery");

    getCards().forEach(interact);
    act(() => {
      vi.advanceTimersByTime(60_000);
    });

    expect(prefetchSpy).not.toHaveBeenCalled();
    expect(loadDownloads).not.toHaveBeenCalled();
  });
});

describe("ComparisonCardSkeleton", () => {
  it("pulses only when motion is allowed", () => {
    const { container } = renderWithProviders(<ComparisonCardSkeleton />);
    const card = container.querySelector(".min-h-40");
    expect(card).toHaveClass("motion-safe:animate-pulse");
    expect(card).not.toHaveClass("animate-pulse");
  });

  it("renders default two badges", () => {
    const { container } = renderWithProviders(<ComparisonCardSkeleton />);
    expect(container.querySelectorAll("[style]")).toHaveLength(2);
  });

  it("renders the requested badge count and class", () => {
    const { container } = renderWithProviders(
      <ComparisonCardSkeleton projectCount={4} className="min-h-52" />,
    );
    expect(container.querySelectorAll("[style]")).toHaveLength(4);
    expect(container.querySelector(".min-h-52")).toBeTruthy();
  });
});
