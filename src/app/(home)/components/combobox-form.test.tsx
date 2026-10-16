import searchNPMRegistry from "@/api/searchNpmRegistry";
import { SELECTED_PROJECTS_LIMIT } from "@/lib/config/constants";
import type { NPMPackageSearch } from "@/lib/schemas/npmPackageSearch.schema";
import { TooltipProvider } from "@/components/ui/tooltip";
import { createTestQueryClient, renderWithForm } from "@/test/render";
import { QueryClientProvider } from "@tanstack/react-query";
import { act, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { FormProvider, useForm, useFormContext } from "react-hook-form";
import { afterEach, describe, expect, it, vi } from "vitest";
import ComboboxForm from "./combobox-form";
import { ProjectsSearchFormValues } from "./projects-form/schema";

vi.mock("@/api/searchNpmRegistry", () => ({ default: vi.fn() }));

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

const LIMITED_PROJECTS = Array.from(
  { length: SELECTED_PROJECTS_LIMIT },
  (_, index) => `project-${index}`,
);

function ComboboxFormHost({
  onFormSubmit,
}: {
  onFormSubmit: (query: string) => void;
}) {
  const form = useFormContext<ProjectsSearchFormValues>();
  return <ComboboxForm form={form} onFormSubmit={onFormSubmit} />;
}

const renderComboboxForm = (projects: string[] = []) => {
  const onFormSubmit = vi.fn();
  const result = renderWithForm(
    <ComboboxFormHost onFormSubmit={onFormSubmit} />,
    { projects },
  );
  return { ...result, onFormSubmit };
};

function ServerComboboxForm({ projects }: { projects: string[] }) {
  const form = useForm<ProjectsSearchFormValues>({
    defaultValues: { search: "", projects },
  });
  return (
    <FormProvider {...form}>
      <ComboboxForm form={form} onFormSubmit={vi.fn()} />
    </FormProvider>
  );
}

const renderComboboxFormOnServer = (projects: string[]) => {
  const container = document.createElement("div");
  container.innerHTML = renderToString(
    <QueryClientProvider client={createTestQueryClient()}>
      <TooltipProvider>
        <ServerComboboxForm projects={projects} />
      </TooltipProvider>
    </QueryClientProvider>,
  );
  return container;
};

const getSearchInput = () => screen.getByRole("combobox");

afterEach(() => {
  vi.mocked(searchNPMRegistry).mockReset();
});

describe("ComboboxForm", { timeout: 15_000 }, () => {
  it("submits the trimmed search value on Enter", async () => {
    const { user, onFormSubmit } = renderComboboxForm();

    await user.type(getSearchInput(), "  react  {Enter}");

    expect(onFormSubmit).toHaveBeenCalledWith("react");
  });

  it("ignores a blank submission", async () => {
    const { user, onFormSubmit } = renderComboboxForm();

    await user.type(getSearchInput(), "   {Enter}");

    expect(onFormSubmit).not.toHaveBeenCalled();
  });

  it("toggles a project when its option is picked", async () => {
    vi.mocked(searchNPMRegistry).mockResolvedValue([
      buildSearchItem("react"),
      buildSearchItem("react-dom"),
    ]);
    const { user, form } = renderComboboxForm();

    await user.type(getSearchInput(), "rea");
    await user.click(
      await screen.findByRole("option", { name: "react" }, { timeout: 2000 }),
    );

    expect(form.getValues("projects")).toEqual(["react"]);
    expect(form.getValues("search")).toBe("");
    expect(getSearchInput()).toHaveFocus();

    await user.type(getSearchInput(), "rea");
    await user.click(
      await screen.findByRole("option", { name: "react" }, { timeout: 2000 }),
    );

    expect(form.getValues("projects")).toEqual([]);
  });

  it("tells the user the search is unavailable when the registry fails", async () => {
    vi.mocked(searchNPMRegistry).mockRejectedValue(new Error("down"));
    const { user } = renderComboboxForm();

    await user.type(getSearchInput(), "rea");

    expect(
      await screen.findByText(
        "Search unavailable, press Enter to add by exact name",
        undefined,
        { timeout: 2000 },
      ),
    ).toBeInTheDocument();
  });

  it("hides the tag list when nothing is selected", () => {
    renderComboboxForm();

    expect(screen.queryByRole("listitem")).not.toBeInTheDocument();
    expect(screen.getByRole("list").parentElement).toHaveClass("hidden");
  });

  it("lists selected projects as tags", () => {
    renderComboboxForm(["react", "vue"]);

    const tags = screen.getAllByRole("listitem");
    expect(tags.map((tag) => tag.textContent)).toEqual(["react", "vue"]);
    expect(
      screen.getByRole("button", { name: "Clear All" }),
    ).toBeInTheDocument();
  });

  it("server-renders the project tags with CSS-variable colours and Clear All", () => {
    const container = renderComboboxFormOnServer(["react", "vue"]);

    const tags = [...container.querySelectorAll("[role='listitem']")];
    expect(tags.map((tag) => tag.textContent)).toEqual(["react", "vue"]);
    expect(tags[0]?.getAttribute("style")).toContain("hsl(var(--chart-1))");
    expect(tags[1]?.getAttribute("style")).toContain("hsl(var(--chart-2))");
    expect(container.textContent).toContain("Clear All");
  });

  it("removes a single tag", async () => {
    const { user, form } = renderComboboxForm(["react", "vue"]);

    await user.click(screen.getByRole("button", { name: "Remove react" }));

    expect(form.getValues("projects")).toEqual(["vue"]);
    expect(screen.getAllByRole("listitem")).toHaveLength(1);
    expect(getSearchInput()).toHaveFocus();
  });

  it("focuses the re-enabled search after removing a tag at the limit", async () => {
    const projects = Array.from({ length: 10 }, (_, index) => `pkg-${index}`);
    const { user, form } = renderComboboxForm(projects);
    expect(getSearchInput()).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "Remove pkg-0" }));

    expect(form.getValues("projects")).toHaveLength(9);
    expect(getSearchInput()).toBeEnabled();
    expect(getSearchInput()).toHaveFocus();
  });

  it("clears every tag with Clear All", async () => {
    const { user, form } = renderComboboxForm(["react", "vue"]);

    await user.click(screen.getByRole("button", { name: "Clear All" }));

    expect(form.getValues("projects")).toEqual([]);
    expect(screen.queryByRole("listitem")).not.toBeInTheDocument();
    expect(getSearchInput()).toHaveFocus();
  });

  it("clears every tag when the Clear All tag body is clicked", async () => {
    const { user, form } = renderComboboxForm(["react"]);

    await user.click(screen.getByText("Clear All", { selector: "div" }));

    expect(form.getValues("projects")).toEqual([]);
  });

  it("styles a tag with a field error", async () => {
    const { form } = renderComboboxForm(["react", "vue"]);

    act(() => {
      form.setError("projects.1", { type: "custom", message: "Not found" });
    });

    const [validTag, invalidTag] = screen.getAllByRole("listitem");
    expect(invalidTag?.style.border).toBe("2px solid red");
    expect(validTag?.style.border).not.toBe("2px solid red");
  });

  it("shows the limit message and disables the input at the limit", () => {
    renderComboboxForm(LIMITED_PROJECTS);

    expect(
      screen.getByText(
        `You cannot select more than ${SELECTED_PROJECTS_LIMIT} projects`,
      ),
    ).toBeInTheDocument();
    expect(getSearchInput()).toBeDisabled();
  });

  it("keeps the input enabled below the limit", () => {
    renderComboboxForm(LIMITED_PROJECTS.slice(1));

    expect(screen.queryByText(/You cannot select more than/)).toBeNull();
    expect(getSearchInput()).toBeEnabled();
  });

  it("marks selected options and links the input to the listbox", async () => {
    vi.mocked(searchNPMRegistry).mockResolvedValue([
      buildSearchItem("react"),
      buildSearchItem("react-dom"),
    ]);
    const { user } = renderComboboxForm(["react"]);

    await user.type(getSearchInput(), "rea");
    const reactOption = await screen.findByRole(
      "option",
      { name: "react" },
      { timeout: 2000 },
    );

    expect(reactOption.querySelector("svg")).toHaveClass("opacity-100");
    expect(
      screen.getByRole("option", { name: "react-dom" }).querySelector("svg"),
    ).toHaveClass("opacity-0");
    expect(getSearchInput()).toHaveAttribute("aria-expanded", "true");
    expect(getSearchInput()).toHaveAttribute(
      "aria-controls",
      screen.getByRole("listbox").id,
    );
  });
});
