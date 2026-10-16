import searchNPMRegistry from "@/api/searchNpmRegistry";
import { SELECTED_PROJECTS_LIMIT } from "@/lib/config/constants";
import LocalStorageKey from "@/lib/enums/LocalStorageKey";
import type { NPMPackageSearch } from "@/lib/schemas/npmPackageSearch.schema";
import { renderWithForm } from "@/test/render";
import { act, screen, waitFor } from "@testing-library/react";
import { toast } from "sonner";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
  type MockInstance,
} from "vitest";
import ProjectsForm from "./projects-form";

const navigationMock = await vi.hoisted(async () => {
  const { createNavigationMock } = await import("@/test/next-navigation");
  return createNavigationMock();
});

const stubs = await vi.hoisted(async () => {
  const { createElement } = await import("react");

  type MultiProps = {
    selectedProjects: string[];
    onAddMultipleProjects: (projects: string[]) => void;
  };
  type SingleProps = {
    selectedProjects: string[];
    onAddProject: (project: string) => void;
  };

  const createMultiStub = (label: string, projects: string[]) =>
    function MultiStub({
      selectedProjects,
      onAddMultipleProjects,
    }: MultiProps) {
      return createElement(
        "button",
        {
          type: "button",
          "data-selected": selectedProjects.join(","),
          onClick: () => onAddMultipleProjects(projects),
        },
        label,
      );
    };

  function SimilarProjectsStub({ onAddProject }: SingleProps) {
    return createElement(
      "button",
      { type: "button", onClick: () => onAddProject("svelte") },
      "add similar",
    );
  }

  function StatsSectionStub({
    selectedProjects,
  }: {
    selectedProjects: string[];
  }) {
    return createElement(
      "output",
      { "aria-label": "stats" },
      selectedProjects.join(","),
    );
  }

  return { createMultiStub, SimilarProjectsStub, StatsSectionStub };
});

vi.mock("next/navigation", () => navigationMock);
vi.mock("@/api/searchNpmRegistry", () => ({ default: vi.fn() }));
vi.mock("sonner", () => ({
  toast: { error: vi.fn(), warning: vi.fn(), success: vi.fn() },
}));
vi.mock("@/app/(home)/components/saved-comparisons", () => ({
  default: stubs.createMultiStub("add saved", ["vue", "vue", "react"]),
}));
vi.mock("@/app/(home)/components/quick-comparisons", () => ({
  default: stubs.createMultiStub("add quick", ["react"]),
}));
vi.mock("@/app/(home)/components/popular-comparisons", () => ({
  default: stubs.createMultiStub("add popular", ["angular"]),
}));
vi.mock("@/app/(home)/components/latest-comparisons", () => ({
  default: stubs.createMultiStub("add latest", ["solid"]),
}));
vi.mock("@/app/(home)/components/similar-projects", () => ({
  default: stubs.SimilarProjectsStub,
}));
vi.mock("@/app/(home)/components/stats-section", () => ({
  default: stubs.StatsSectionStub,
}));

type SearchItem = NPMPackageSearch["objects"][number];

const buildSearchItem = (name: string): SearchItem => ({
  package: {
    name,
    version: "1.0.0",
    date: "2024-01-01",
    links: { npm: `https://www.npmjs.com/package/${name}` },
    maintainers: [],
  },
  score: {
    final: 1,
    detail: { quality: 1, popularity: 1, maintenance: 1 },
  },
  searchScore: 1,
});

const KNOWN_PACKAGES = ["react", "vue", "svelte", "preact"] as const;

const registryLookup = async (query: string) =>
  KNOWN_PACKAGES.filter((name) => name.startsWith(query)).map(buildSearchItem);

const jsonResponse = (body: unknown, ok = true) =>
  ({ ok, json: async () => body }) as Response;

const COMPARISONS_URL = "/api/comparisons";

let fetchSpy: MockInstance<typeof fetch>;
let consoleError: MockInstance<typeof console.error>;
let consoleWarn: MockInstance<typeof console.warn>;
let consoleInfo: MockInstance<typeof console.info>;

const comparisonCalls = () =>
  fetchSpy.mock.calls.filter(([url]) => url === COMPARISONS_URL);

const trackedBodies = () =>
  comparisonCalls().map(([, init]) => JSON.parse(String(init?.body)));

const renderProjectsForm = (projects: string[] = []) =>
  renderWithForm(<ProjectsForm />, { projects });

const getSearchInput = () => screen.getByRole("combobox");

beforeEach(() => {
  vi.mocked(searchNPMRegistry).mockImplementation(registryLookup);
  fetchSpy = vi
    .spyOn(globalThis, "fetch")
    .mockResolvedValue(jsonResponse({ id: "comparison-1" }));
  consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
  consoleWarn = vi.spyOn(console, "warn").mockImplementation(() => {});
  consoleInfo = vi.spyOn(console, "info").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.mocked(searchNPMRegistry).mockReset();
  vi.mocked(toast.error).mockClear();
  vi.mocked(toast.warning).mockClear();
  navigationMock.reset();
  localStorage.clear();
});

describe("ProjectsForm", { timeout: 15_000 }, () => {
  describe("adding projects", () => {
    it("adds a project picked from the options", async () => {
      const { user, form } = renderProjectsForm();

      await user.type(getSearchInput(), "vu");
      await user.click(
        await screen.findByRole("option", { name: "vue" }, { timeout: 2000 }),
      );

      expect(form.getValues("projects")).toEqual(["vue"]);
      expect(screen.getByRole("listitem")).toHaveTextContent("vue");
    });

    it("adds a found project on Enter and clears the search", async () => {
      const { user, form } = renderProjectsForm();

      await user.type(getSearchInput(), "react{Enter}");

      await waitFor(() =>
        expect(form.getValues("projects")).toEqual(["react"]),
      );
      expect(form.getValues("search")).toBe("");
      expect(searchNPMRegistry).toHaveBeenCalledWith("react");
      expect(navigationMock.router.replace).toHaveBeenCalled();
    });

    it("shows a not found toast for an unknown single project", async () => {
      const { user, form } = renderProjectsForm();

      await user.type(getSearchInput(), "nope{Enter}");

      await waitFor(() =>
        expect(toast.error).toHaveBeenCalledWith('Project "nope" not found'),
      );
      expect(form.getValues("projects")).toEqual([]);
      expect(form.getValues("search")).toBe("");
    });

    it("skips the registry lookup for an already selected project", async () => {
      const { user, form } = renderProjectsForm(["react"]);

      await user.type(getSearchInput(), "react{Enter}");

      await waitFor(() => expect(form.getValues("search")).toBe(""));
      expect(form.getValues("projects")).toEqual(["react"]);
      expect(searchNPMRegistry).not.toHaveBeenCalledWith("react");
      expect(toast.error).not.toHaveBeenCalled();
    });

    it("adds comma-separated projects and reports missing and duplicates", async () => {
      vi.mocked(searchNPMRegistry).mockImplementation(async (query) => {
        if (query === "broken") throw new Error("network");
        return registryLookup(query);
      });
      const { user, form } = renderProjectsForm(["react"]);

      await user.type(
        getSearchInput(),
        "vue, svelte,react,vue,ghost,broken{Enter}",
      );

      await waitFor(() =>
        expect(form.getValues("projects")).toEqual(["react", "vue", "svelte"]),
      );
      expect(toast.error).toHaveBeenCalledWith(
        "Projects not found: ghost, broken",
      );
      expect(toast.warning).toHaveBeenCalledWith(
        "Projects already selected: react, vue",
      );
      expect(form.getValues("search")).toBe("");
    });

    it("keeps the selection when no comma-separated project is found", async () => {
      const { user, form } = renderProjectsForm(["react"]);

      await user.type(getSearchInput(), "ghost,phantom{Enter}");

      await waitFor(() =>
        expect(toast.error).toHaveBeenCalledWith(
          "Projects not found: ghost, phantom",
        ),
      );
      expect(form.getValues("projects")).toEqual(["react"]);
      expect(toast.warning).not.toHaveBeenCalled();
    });

    it("ignores a search made of delimiters only", async () => {
      const { user, form } = renderProjectsForm();

      await user.type(getSearchInput(), ", ,{Enter}");

      await waitFor(() => expect(form.getValues("search")).toBe(""));
      expect(searchNPMRegistry).not.toHaveBeenCalled();
      expect(toast.error).not.toHaveBeenCalled();
      expect(toast.warning).not.toHaveBeenCalled();
    });

    it("adds unique new projects from comparison lists", async () => {
      const { user, form } = renderProjectsForm(["react"]);

      await user.click(screen.getByRole("button", { name: "add saved" }));

      expect(form.getValues("projects")).toEqual(["react", "vue"]);
      expect(screen.getByRole("status", { name: "stats" })).toHaveTextContent(
        "react,vue",
      );
    });

    it("leaves the selection untouched when the list adds nothing new", async () => {
      const { user, form } = renderProjectsForm(["react"]);
      const setValue = vi.spyOn(form, "setValue");

      await user.click(screen.getByRole("button", { name: "add quick" }));

      expect(setValue).not.toHaveBeenCalled();
      expect(form.getValues("projects")).toEqual(["react"]);
    });

    it("adds a similar project once", async () => {
      const { user, form } = renderProjectsForm(["react"]);

      await user.click(screen.getByRole("button", { name: "add similar" }));
      await user.click(screen.getByRole("button", { name: "add similar" }));

      expect(form.getValues("projects")).toEqual(["react", "svelte"]);
    });

    it("disables the search at the selection limit", () => {
      renderProjectsForm(
        Array.from(
          { length: SELECTED_PROJECTS_LIMIT },
          (_, index) => `project-${index}`,
        ),
      );

      expect(getSearchInput()).toBeDisabled();
      expect(
        screen.getByText(
          `You cannot select more than ${SELECTED_PROJECTS_LIMIT} projects`,
        ),
      ).toBeInTheDocument();
    });
  });

  describe("save comparison", () => {
    it("is hidden without a selection", () => {
      renderProjectsForm();

      expect(
        screen.queryByRole("button", { name: /Save comparison|Saved/ }),
      ).not.toBeInTheDocument();
    });

    it("toggles the favorite with aria-pressed", async () => {
      const { user } = renderProjectsForm(["preact", "svelte"]);

      const saveButton = screen.getByRole("button", {
        name: "Save comparison",
      });
      expect(saveButton).toHaveAttribute("aria-pressed", "false");

      await user.click(saveButton);

      const savedButton = screen.getByRole("button", { name: "Saved" });
      expect(savedButton).toHaveAttribute("aria-pressed", "true");
      expect(
        JSON.parse(localStorage.getItem(LocalStorageKey.FAVORITES) ?? "[]"),
      ).toEqual([["preact", "svelte"]]);

      await user.click(savedButton);

      expect(
        screen.getByRole("button", { name: "Save comparison" }),
      ).toHaveAttribute("aria-pressed", "false");
      expect(localStorage.getItem(LocalStorageKey.FAVORITES)).toBe("[]");
    });
  });

  describe("trackComparison", () => {
    it("does not track an empty selection", () => {
      renderProjectsForm();

      expect(comparisonCalls()).toHaveLength(0);
    });

    it("posts the selection and only re-tracks real changes", async () => {
      const { form } = renderProjectsForm(["react", "vue"]);

      await waitFor(() => expect(comparisonCalls()).toHaveLength(1));
      expect(fetchSpy).toHaveBeenCalledWith(COMPARISONS_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projects: ["react", "vue"] }),
      });

      act(() => form.setValue("projects", ["vue", "react"]));
      act(() => form.setValue("projects", ["react", "svelte"]));
      act(() => form.setValue("projects", ["react"]));

      await waitFor(() => expect(comparisonCalls()).toHaveLength(3));
      expect(trackedBodies()).toEqual([
        { projects: ["react", "vue"] },
        { projects: ["react", "svelte"] },
        { projects: ["react"] },
      ]);
    });

    it("logs validation details from a successful response", async () => {
      fetchSpy.mockResolvedValue(
        jsonResponse({
          validation: {
            invalidPackages: ["ghost"],
            message: "1 package filtered",
          },
        }),
      );
      renderProjectsForm(["react", "ghost"]);

      await waitFor(() =>
        expect(consoleInfo).toHaveBeenCalledWith("1 package filtered"),
      );
      expect(consoleWarn).toHaveBeenCalledWith(
        "Some packages were filtered out: ghost",
      );
    });

    it("logs only the validation message when nothing was filtered", async () => {
      fetchSpy.mockResolvedValue(
        jsonResponse({
          validation: { invalidPackages: [], message: "All valid" },
        }),
      );
      renderProjectsForm(["react"]);

      await waitFor(() =>
        expect(consoleInfo).toHaveBeenCalledWith("All valid"),
      );
      expect(consoleWarn).not.toHaveBeenCalled();
    });

    it("logs an error for a failed response", async () => {
      fetchSpy.mockResolvedValue(jsonResponse({}, false));
      renderProjectsForm(["react"]);

      await waitFor(() =>
        expect(consoleError).toHaveBeenCalledWith(
          "Failed to track comparison.",
        ),
      );
    });

    it("logs an error when the request throws", async () => {
      fetchSpy.mockRejectedValue(new Error("offline"));
      renderProjectsForm(["react"]);

      await waitFor(() =>
        expect(consoleError).toHaveBeenCalledWith(
          "Failed to track comparison.",
        ),
      );
    });
  });
});
