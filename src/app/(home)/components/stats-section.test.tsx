import useProjectsStats from "@/lib/queries/useProjectsStats";
import { buildProjectStats, buildSuccessQuery } from "@/test/factories";
import { renderWithForm } from "@/test/render";
import { screen } from "@testing-library/react";
import { useFormContext } from "react-hook-form";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ChartSection from "./chart-section";
import { ProjectsSearchFormValues } from "./projects-form/schema";
import StatsSection from "./stats-section";
import TableSection from "./table-section";
import WidgetsSection from "./widgets-section";

vi.mock("@/lib/queries/useProjectsStats");
vi.mock("./chart-section", () => ({
  default: vi.fn(() => <div data-testid="chart-section" />),
}));
vi.mock("./table-section", () => ({
  default: vi.fn(() => <div data-testid="table-section" />),
}));
vi.mock("./widgets-section", () => ({
  default: vi.fn(() => <div data-testid="widgets-section" />),
}));

const SELECTED_PROJECTS = ["react", "vue"] as const;

const stats = SELECTED_PROJECTS.map((name) =>
  buildSuccessQuery(buildProjectStats(name)),
);

const lastPropsOf = (component: unknown) =>
  vi.mocked(component as (props: object) => null).mock.lastCall?.[0];

function StatsSectionHost() {
  const form = useFormContext<ProjectsSearchFormValues>();
  return <StatsSection form={form} selectedProjects={[...SELECTED_PROJECTS]} />;
}

describe("StatsSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useProjectsStats).mockReturnValue(stats);
  });

  it("fetches stats for the selected projects with the form", () => {
    const { form } = renderWithForm(<StatsSectionHost />);

    expect(useProjectsStats).toHaveBeenCalledWith(
      [...SELECTED_PROJECTS],
      expect.objectContaining({ watch: form.watch, control: form.control }),
    );
  });

  it("renders chart, table and widgets in order with the same stats", () => {
    renderWithForm(<StatsSectionHost />);

    const sections = screen.getAllByTestId(/-section$/);
    expect(sections.map((section) => section.dataset.testid)).toEqual([
      "chart-section",
      "table-section",
      "widgets-section",
    ]);
    expect(lastPropsOf(ChartSection)).toEqual({ projectStats: stats });
    expect(lastPropsOf(TableSection)).toEqual({ projectsStats: stats });
    expect(lastPropsOf(WidgetsSection)).toEqual({ projectsStats: stats });
  });

  it("exposes a display name for devtools", () => {
    expect(StatsSection.displayName).toBe("StatsSection");
  });
});
