import searchNPMRegistry from "@/api/searchNpmRegistry";
import LocalStorageKey from "@/lib/enums/LocalStorageKey";
import useLatestComparisons from "@/lib/queries/useLatestComparisons";
import usePopularComparisons from "@/lib/queries/usePopularComparisons";
import { QUICK_COMPARISONS } from "@/lib/config/comparison-presets";
import { buildGlobalComparison } from "@/test/factories";
import { renderWithForm, renderWithProviders } from "@/test/render";
import { zodResolver } from "@hookform/resolvers/zod";
import { screen } from "@testing-library/react";
import { useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ProjectsForm from "./projects-form";
import { ProjectsSearchFormSchema, ProjectsSearchFormValues } from "./schema";

const navigationMock = await vi.hoisted(async () => {
  const { createNavigationMock } = await import("@/test/next-navigation");
  return createNavigationMock();
});

const cardRenders = vi.hoisted(() => ({ count: 0 }));

vi.mock("next/navigation", () => navigationMock);
vi.mock("@/api/searchNpmRegistry", () => ({ default: vi.fn() }));
vi.mock("@/lib/queries/useLatestComparisons");
vi.mock("@/lib/queries/usePopularComparisons");
vi.mock("@/app/(home)/components/comparison-card", async () => {
  const { createElement } = await import("react");
  return {
    default: ({ projects }: { projects: string[] }) => {
      cardRenders.count += 1;
      return createElement("div", { "data-testid": "card" }, projects.join());
    },
    ComparisonCardSkeleton: () => null,
  };
});

function FormShell() {
  const form = useForm<ProjectsSearchFormValues>({
    resolver: zodResolver(ProjectsSearchFormSchema),
    defaultValues: { search: "", projects: [] },
  });
  return (
    <FormProvider {...form}>
      <ProjectsForm />
    </FormProvider>
  );
}

function ParentHost() {
  const [renders, setRenders] = useState(0);
  return (
    <>
      <button
        type="button"
        data-renders={renders}
        onClick={() => setRenders((count) => count + 1)}
      >
        re-render parent
      </button>
      <ProjectsForm />
    </>
  );
}

const FEED = {
  latest: [
    buildGlobalComparison({ id: "a", projects: ["react", "vue"] }),
    buildGlobalComparison({ id: "b", projects: ["zod", "yup"] }),
  ],
  popular: [
    {
      projects: ["jest", "vitest"],
      count: 5,
      lastUsed: 1,
      averageProjectsCount: 2,
    },
  ],
  saved: [["svelte", "solid-js"]],
} as const;

const EXPECTED_CARDS =
  QUICK_COMPARISONS.length +
  FEED.latest.length +
  FEED.popular.length +
  FEED.saved.length;

beforeEach(() => {
  cardRenders.count = 0;
  localStorage.setItem(LocalStorageKey.FAVORITES, JSON.stringify(FEED.saved));
  window.dispatchEvent(
    new StorageEvent("storage", { key: LocalStorageKey.FAVORITES }),
  );
  vi.mocked(searchNPMRegistry).mockResolvedValue([]);
  vi.mocked(useLatestComparisons).mockReturnValue({
    isLoading: false,
    data: { comparisons: FEED.latest, total: FEED.latest.length },
  } as never);
  vi.mocked(usePopularComparisons).mockReturnValue({
    isLoading: false,
    data: { comparisons: FEED.popular, total: FEED.popular.length },
  } as never);
  vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({}));
});

afterEach(() => {
  vi.restoreAllMocks();
  navigationMock.reset();
  localStorage.clear();
});

describe("ProjectsForm render isolation", () => {
  it("typing in the search does not re-render the comparison cards", async () => {
    const { user } = renderWithProviders(<FormShell />);

    expect(screen.getAllByTestId("card")).toHaveLength(EXPECTED_CARDS);
    const rendersAfterMount = cardRenders.count;

    await user.type(screen.getByRole("combobox"), "react router");

    expect(screen.getByRole("combobox")).toHaveValue("react router");
    expect(cardRenders.count).toBe(rendersAfterMount);
  });

  it("a parent re-render with an unchanged selection skips the cards", async () => {
    const { user } = renderWithForm(<ParentHost />);
    const rendersAfterMount = cardRenders.count;

    await user.click(screen.getByRole("button", { name: "re-render parent" }));
    await user.click(screen.getByRole("button", { name: "re-render parent" }));

    expect(
      screen.getByRole("button", { name: "re-render parent" }),
    ).toHaveAttribute("data-renders", "2");
    expect(cardRenders.count).toBe(rendersAfterMount);
  });
});
