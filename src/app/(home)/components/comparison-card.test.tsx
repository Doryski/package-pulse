import { getProjectStatsQueryKey } from "@/lib/queries/keys";
import { PREFETCH_INTENT_DELAY_MS } from "@/lib/queries/usePrefetchProjectsStats";
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

describe("ComparisonCard stats prefetch", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const renderCard = () =>
    renderWithProviders(
      <ComparisonCard
        projects={["react", "vue"]}
        title="Frameworks"
        href="/compare/react-vs-vue"
      />,
    );

  const getCard = () =>
    screen.getByRole("link").closest<HTMLElement>(".rounded-xl");

  it("prefetches every project's stats after a short hover", () => {
    const { queryClient } = renderCard();
    const prefetchSpy = vi.spyOn(queryClient, "prefetchQuery");

    fireEvent.pointerEnter(getCard()!);
    expect(prefetchSpy).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(PREFETCH_INTENT_DELAY_MS);
    });

    expect(prefetchSpy).toHaveBeenCalledTimes(2);
    expect(prefetchSpy.mock.calls.map(([options]) => options.queryKey)).toEqual(
      [getProjectStatsQueryKey("react"), getProjectStatsQueryKey("vue")],
    );
    expect(loadDownloads).toHaveBeenCalledWith(
      "react",
      expect.any(AbortSignal),
    );
    expect(loadDownloads).toHaveBeenCalledWith("vue", expect.any(AbortSignal));
  });

  it("skips the prefetch when the pointer only passes over the card", () => {
    const { queryClient } = renderCard();
    const prefetchSpy = vi.spyOn(queryClient, "prefetchQuery");

    fireEvent.pointerEnter(getCard()!);
    fireEvent.pointerLeave(getCard()!);
    act(() => {
      vi.advanceTimersByTime(PREFETCH_INTENT_DELAY_MS);
    });

    expect(prefetchSpy).not.toHaveBeenCalled();
  });

  it("prefetches when the card action keeps keyboard focus", () => {
    const { queryClient } = renderCard();
    const prefetchSpy = vi.spyOn(queryClient, "prefetchQuery");

    act(() => {
      screen.getByRole("link").focus();
    });
    act(() => {
      vi.advanceTimersByTime(PREFETCH_INTENT_DELAY_MS);
    });

    expect(screen.getByRole("link")).toHaveFocus();
    expect(prefetchSpy).toHaveBeenCalledTimes(2);
  });

  it("does not refetch stats that are already in flight", () => {
    renderCard();

    fireEvent.pointerEnter(getCard()!);
    act(() => {
      vi.advanceTimersByTime(PREFETCH_INTENT_DELAY_MS);
    });
    fireEvent.pointerEnter(getCard()!);
    act(() => {
      vi.advanceTimersByTime(PREFETCH_INTENT_DELAY_MS);
    });

    expect(loadDownloads).toHaveBeenCalledTimes(2);
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
