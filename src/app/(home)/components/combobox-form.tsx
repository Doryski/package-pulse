"use client";
import ClientOnly from "@/components/ui/client-only";
import { Combobox } from "@/components/ui/combobox";
import { FormField, FormItem, FormMessage } from "@/components/ui/form";
import Tag from "@/components/ui/tag";
import { SELECTED_PROJECTS_LIMIT } from "@/lib/config/constants";
import useDebounce from "@/lib/hooks/useDebounce";
import useSearchNPMRegistry from "@/lib/queries/useSearchNPMRegistry";
import { cn } from "@/lib/utils/cn";
import { UseFormReturn } from "react-hook-form";
import ProjectTag from "./project-tag";
import { ProjectsSearchFormValues } from "./projects-form/schema";

type ComboboxFormProps = {
  form: UseFormReturn<ProjectsSearchFormValues>;
  onFormSubmit: (query: string) => void;
};

const ComboboxForm = ({ form, onFormSubmit }: ComboboxFormProps) => {
  const search = form.watch("search");
  const debouncedSearch = useDebounce(search, 400);
  const npmRegistry = useSearchNPMRegistry(debouncedSearch);

  const selectedProjects = form.watch("projects");
  const hasExceededSelectedProjectsLimit =
    selectedProjects.length >= SELECTED_PROJECTS_LIMIT;

  function resetSearch() {
    form.setValue("search", "");
    form.setFocus("search");
  }

  async function selectProject(projectName: string) {
    if (selectedProjects.includes(projectName)) {
      form.setValue(
        "projects",
        selectedProjects.filter((project) => project !== projectName),
      );
    } else {
      form.setValue("projects", [...selectedProjects, projectName]);
    }
    resetSearch();
  }

  function onSubmit(data: ProjectsSearchFormValues) {
    const searchValue = data.search.trim();
    if (!searchValue) return;
    onFormSubmit(searchValue);
  }

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit, console.error)}
      className="flex flex-col gap-4"
    >
      <div className="flex w-full flex-col items-start gap-2">
        <Combobox
          fullwidth
          options={npmRegistry.data}
          isLoadingOptions={npmRegistry.isLoading}
          form={form}
          disabled={hasExceededSelectedProjectsLimit}
          onSelectItem={selectProject}
          optionValuePredicate={(option) => option.package.name}
        />
        {hasExceededSelectedProjectsLimit && (
          <FormMessage className="text-xs text-destructive">
            You cannot select more than {SELECTED_PROJECTS_LIMIT} projects
          </FormMessage>
        )}
        <div className="text-xs text-muted-foreground">
          Tip: You can enter multiple projects separated by commas (e.g.
          &quot;react,vue,svelte&quot;)
        </div>
      </div>

      <FormField
        control={form.control}
        name="projects"
        render={({ field, formState }) => (
          <FormItem className={cn(selectedProjects.length === 0 && "hidden")}>
            <div className="flex flex-wrap gap-2" role="list">
              {field.value.map((project, index) => {
                const error = formState.errors.projects?.[index];

                return (
                  <ClientOnly key={project}>
                    <ProjectTag
                      key={project}
                      project={project}
                      error={error}
                      colorIndex={field.value.indexOf(project)}
                      onRemove={() =>
                        form.setValue(
                          "projects",
                          field.value.filter((p) => p !== project),
                        )
                      }
                    />
                  </ClientOnly>
                );
              })}
              <ClientOnly>
                <ClearAllTag onClick={() => form.setValue("projects", [])} />
              </ClientOnly>
            </div>
          </FormItem>
        )}
      />
    </form>
  );
};

type ClearAllTagProps = {
  onClick: () => void;
};

const ClearAllTag = ({ onClick }: ClearAllTagProps) => {
  return (
    <Tag
      onRemove={onClick}
      onClick={onClick}
      className="cursor-pointer"
      tooltipContent="Clear All"
    >
      Clear All
    </Tag>
  );
};

export default ComboboxForm;
