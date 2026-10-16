import searchNPMRegistry from "@/api/searchNpmRegistry";
import { SELECTED_PROJECTS_LIMIT } from "@/lib/config/constants";
import LocalStorageKey from "@/lib/enums/LocalStorageKey";
import type { NPMPackageSearch } from "@/lib/schemas/npmPackageSearch.schema";
import { TooltipProvider } from "@/components/ui/tooltip";
import { createTestQueryClient, renderWithForm } from "@/test/render";
import { QueryClientProvider } from "@tanstack/react-query";
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
import { PropsWithChildren } from "react";
import { renderToString } from "react-dom/server";
import { FormProvider, useForm } from "react-hook-form";
import ProjectsForm from "./projects-form";
import { ProjectsSearchFormValues } from "./schema";

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

const statusResponse = (status: number) =>
  ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => ({}),
  }) as Response;

const PACKAGE_INFO_PATH = "/api/package-info";
const UPSTREAM_FAILING_PACKAGE = "broken";

const buildPackageInfo = (projectName: string) => ({
  projectName,
  repoName: null,
  repositoryUrl: null,
  homepage: null,
  description: null,
  license: null,
  createdAt: null,
  lastReleaseDate: null,
  latestVersion: "1.0.0",
  dependenciesCount: null,
  devDependenciesCount: null,
  contributorsCount: 0,
  latestRelease: null,
});

const isKnownPackage = (name: string) =>
  KNOWN_PACKAGES.some((known) => known === name);

const toPackageError = (name: string) =>
  name === UPSTREAM_FAILING_PACKAGE ? "upstream" : "notFound";

const readRequestedPackages = (url: string) =>
  (new URL(url, "http://localhost").searchParams.get("packages") ?? "")
    .split(",")
    .filter(Boolean);

const packageInfoResponse = (url: string) => {
  const names = readRequestedPackages(url);
  const missing = names.filter((name) => !isKnownPackage(name));
  return jsonResponse({
    data: Object.fromEntries(
      names.map((name) => [
        name,
        isKnownPackage(name) ? buildPackageInfo(name) : null,
      ]),
    ),
    errors: Object.fromEntries(
      missing.map((name) => [name, toPackageError(name)]),
    ),
  });
};

const isPackageInfoUrl = (url: unknown) =>
  typeof url === "string" && url.startsWith(PACKAGE_INFO_PATH);

const routeFetch = async (input: Parameters<typeof fetch>[0]) => {
  if (isPackageInfoUrl(input)) return packageInfoResponse(String(input));
  return jsonResponse({ id: "comparison-1" });
};

const COMPARISONS_URL = "/api/comparisons";
const TRACK_DELAY_MS = 2000;

let fetchSpy: MockInstance<typeof fetch>;
let consoleError: MockInstance<typeof console.error>;
let consoleWarn: MockInstance<typeof console.warn>;
let consoleInfo: MockInstance<typeof console.info>;

const packageInfoCalls = () =>
  fetchSpy.mock.calls.filter(([url]) => isPackageInfoUrl(url));

const comparisonCalls = () =>
  fetchSpy.mock.calls.filter(([url]) => url === COMPARISONS_URL);

const trackedBodies = () =>
  comparisonCalls().map(([, init]) => JSON.parse(String(init?.body)));

function FormStub({
  projects,
  children,
}: PropsWithChildren<{ projects: string[] }>) {
  const form = useForm<ProjectsSearchFormValues>({
    defaultValues: { search: "", projects },
  });
  return (
    <QueryClientProvider client={createTestQueryClient()}>
      <TooltipProvider>
        <FormProvider {...form}>{children}</FormProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

const renderProjectsForm = (projects: string[] = []) =>
  renderWithForm(<ProjectsForm />, { projects });

const getSearchInput = () => screen.getByRole("combobox");

beforeEach(() => {
  vi.mocked(searchNPMRegistry).mockImplementation(registryLookup);
  fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(routeFetch);
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
  describe("stats section", () => {
    it("shows a chart-sized skeleton until the stats chunk loads", async () => {
      renderProjectsForm(["react"]);

      const skeleton = document.querySelector('[aria-busy="true"]');
      expect(skeleton).toHaveClass("mt-4", "size-full", "md:mt-8", "lg:mt-16");
      expect(skeleton?.firstElementChild).toHaveClass(
        "aspect-square",
        "max-h-[450px]",
        "w-full",
        "sm:aspect-video",
      );

      expect(
        await screen.findByRole("status", { name: "stats" }),
      ).toHaveTextContent("react");
      expect(
        document.querySelector('[aria-busy="true"]'),
      ).not.toBeInTheDocument();
    });

    it("is not rendered without a selection", () => {
      renderProjectsForm();

      expect(
        screen.queryByRole("status", { name: "stats" }),
      ).not.toBeInTheDocument();
      expect(
        document.querySelector('[aria-busy="true"]'),
      ).not.toBeInTheDocument();
    });
  });

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
      expect(packageInfoCalls()).toHaveLength(1);
      expect(packageInfoCalls()[0]![0]).toBe(
        `${PACKAGE_INFO_PATH}?packages=react`,
      );
      expect(navigationMock.replaceState).toHaveBeenCalledWith(
        null,
        "",
        "/?projects=react",
      );
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
      expect(packageInfoCalls()).toHaveLength(0);
      expect(toast.error).not.toHaveBeenCalled();
    });

    it("adds comma-separated projects and reports missing and duplicates", async () => {
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
      expect(packageInfoCalls()).toHaveLength(0);
      expect(toast.error).not.toHaveBeenCalled();
      expect(toast.warning).not.toHaveBeenCalled();
    });

    it("checks five pasted names with a single package-info request", async () => {
      const { user, form } = renderProjectsForm();

      await user.type(getSearchInput(), "react,vue,svelte,preact,ghost{Enter}");

      await waitFor(() =>
        expect(form.getValues("projects")).toEqual([
          "react",
          "vue",
          "svelte",
          "preact",
        ]),
      );
      expect(packageInfoCalls()).toHaveLength(1);
      expect(
        readRequestedPackages(String(packageInfoCalls()[0]![0])).toSorted(),
      ).toEqual(["ghost", "preact", "react", "svelte", "vue"]);
      expect(toast.error).toHaveBeenCalledWith("Projects not found: ghost");
    });

    it("reuses cached package info for a project added again", async () => {
      const { user, form } = renderProjectsForm();

      await user.type(getSearchInput(), "vue{Enter}");
      await waitFor(() => expect(form.getValues("projects")).toEqual(["vue"]));
      act(() => form.setValue("projects", []));
      await user.type(getSearchInput(), "vue{Enter}");

      await waitFor(() => expect(form.getValues("projects")).toEqual(["vue"]));
      expect(packageInfoCalls()).toHaveLength(1);
    });

    it("adds unique new projects from comparison lists", async () => {
      const { user, form } = renderProjectsForm(["react"]);

      await user.click(screen.getByRole("button", { name: "add saved" }));

      expect(form.getValues("projects")).toEqual(["react", "vue"]);
      expect(
        await screen.findByRole("status", { name: "stats" }),
      ).toHaveTextContent("react,vue");
    });

    it("leaves the selection untouched when the list adds nothing new", async () => {
      const { user, form } = renderProjectsForm(["react"]);
      const projectsBefore = form.getValues("projects");

      await user.click(screen.getByRole("button", { name: "add quick" }));

      expect(form.getValues("projects")).toBe(projectsBefore);
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
    it("reserves the button height before hydration", () => {
      const html = renderToString(
        <FormStub projects={["react"]}>
          <ProjectsForm />
        </FormStub>,
      );
      const container = document.createElement("div");
      container.innerHTML = html;

      const fallback = container.querySelector(
        '[data-testid="save-comparison-fallback"]',
      );
      expect(fallback).toHaveClass("h-8");
      expect(fallback).toHaveAttribute("aria-hidden", "true");
      expect(fallback?.parentElement).toHaveClass(
        "mt-3",
        "flex",
        "justify-end",
      );
      expect(html).not.toContain("Save comparison");
    });

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
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    const advance = (ms: number) =>
      act(async () => {
        await vi.advanceTimersByTimeAsync(ms);
      });

    const settleTracking = () => advance(TRACK_DELAY_MS);

    it("does not track an empty selection", async () => {
      renderProjectsForm();

      await settleTracking();

      expect(comparisonCalls()).toHaveLength(0);
    });

    it("posts the initial selection only after the debounce delay", async () => {
      renderProjectsForm(["react", "vue"]);

      await advance(TRACK_DELAY_MS - 1);
      expect(comparisonCalls()).toHaveLength(0);

      await advance(1);
      expect(comparisonCalls()).toHaveLength(1);
      expect(fetchSpy).toHaveBeenCalledWith(COMPARISONS_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projects: ["react", "vue"] }),
      });
    });

    it("posts once, 2 s after the last of rapid selection changes", async () => {
      const { form } = renderProjectsForm();

      act(() => form.setValue("projects", ["react"]));
      await advance(500);
      act(() => form.setValue("projects", ["react", "vue"]));
      await advance(1500);
      act(() => form.setValue("projects", ["react", "vue", "svelte"]));
      await advance(TRACK_DELAY_MS - 1);

      expect(comparisonCalls()).toHaveLength(0);

      await advance(1);

      expect(trackedBodies()).toEqual([
        { projects: ["react", "vue", "svelte"] },
      ]);
    });

    it("only re-tracks real changes", async () => {
      const { form } = renderProjectsForm(["react", "vue"]);
      await settleTracking();

      act(() => form.setValue("projects", ["vue", "react"]));
      await settleTracking();
      act(() => form.setValue("projects", ["react", "svelte"]));
      await settleTracking();
      act(() => form.setValue("projects", ["react"]));
      await settleTracking();

      expect(trackedBodies()).toEqual([
        { projects: ["react", "vue"] },
        { projects: ["react", "svelte"] },
        { projects: ["react"] },
      ]);
    });

    it("re-tracks a selection restored after it was cleared", async () => {
      const { form } = renderProjectsForm(["react"]);
      await settleTracking();

      act(() => form.setValue("projects", []));
      await settleTracking();
      act(() => form.setValue("projects", ["react"]));
      await settleTracking();

      expect(trackedBodies()).toEqual([
        { projects: ["react"] },
        { projects: ["react"] },
      ]);
    });

    it("cancels a pending post on unmount", async () => {
      const { unmount } = renderProjectsForm(["react"]);

      unmount();
      await settleTracking();

      expect(comparisonCalls()).toHaveLength(0);
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

      await settleTracking();

      expect(consoleInfo).toHaveBeenCalledWith("1 package filtered");
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

      await settleTracking();

      expect(consoleInfo).toHaveBeenCalledWith("All valid");
      expect(consoleWarn).not.toHaveBeenCalled();
    });

    it("logs an error for a failed response", async () => {
      fetchSpy.mockResolvedValue(jsonResponse({}, false));
      renderProjectsForm(["react"]);

      await settleTracking();

      expect(consoleError).toHaveBeenCalledWith("Failed to track comparison.");
    });

    it.each([
      { status: 409, reason: "duplicate comparison" },
      { status: 429, reason: "rate limited" },
    ])(
      "stays silent when the server rejects tracking as $reason ($status)",
      async ({ status }) => {
        fetchSpy.mockResolvedValue(statusResponse(status));
        renderProjectsForm(["react"]);

        await settleTracking();

        expect(comparisonCalls()).toHaveLength(1);
        expect(consoleError).not.toHaveBeenCalled();
      },
    );

    it.each([400, 403, 500, 503])(
      "logs an error for an unexpected %i response",
      async (status) => {
        fetchSpy.mockResolvedValue(statusResponse(status));
        renderProjectsForm(["react"]);

        await settleTracking();

        expect(consoleError).toHaveBeenCalledWith(
          "Failed to track comparison.",
        );
      },
    );

    it("stays silent when a remount re-tracks an already tracked selection", async () => {
      fetchSpy.mockResolvedValue(statusResponse(201));
      const first = renderProjectsForm(["react", "vue"]);
      await settleTracking();
      first.unmount();

      fetchSpy.mockResolvedValue(statusResponse(409));
      renderProjectsForm(["react", "vue"]);
      await settleTracking();

      expect(comparisonCalls()).toHaveLength(2);
      expect(consoleError).not.toHaveBeenCalled();
    });

    it("logs an error when the request throws", async () => {
      fetchSpy.mockRejectedValue(new Error("offline"));
      renderProjectsForm(["react"]);

      await settleTracking();

      expect(consoleError).toHaveBeenCalledWith("Failed to track comparison.");
    });
  });
});
