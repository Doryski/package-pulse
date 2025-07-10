"use client";
import searchNPMRegistry from "@/api/searchNpmRegistry";
import ClientOnly from "@/components/ui/client-only";
import { Combobox } from "@/components/ui/combobox";
import { Form, FormField, FormItem, FormMessage } from "@/components/ui/form";
import Tag from "@/components/ui/tag";
import {
  MULTI_SEARCH_DELIMITER,
  SELECTED_PROJECTS_LIMIT,
} from "@/lib/config/constants";
import useDebounce from "@/lib/hooks/useDebounce";
import useSearchNPMRegistry from "@/lib/queries/useSearchNPMRegistry";
import { cn } from "@/lib/utils/cn";
import { UseFormReturn } from "react-hook-form";
import { toast } from "sonner";
import { isSingleItemArray } from "../utils/array-utils";
import ProjectTag from "./project-tag";
import { ProjectsSearchFormValues } from "./projects-form/schema";

const parseSearchValue = (searchValue: string) => {
  const cleanedValues = searchValue
    .split(MULTI_SEARCH_DELIMITER)
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
  return [...new Set(cleanedValues)];
};

type ComboboxFormProps = {
  form: UseFormReturn<ProjectsSearchFormValues>;
};

const ComboboxForm = ({ form }: ComboboxFormProps) => {
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

  async function searchProject(projectName: string) {
    if (!selectedProjects.includes(projectName)) {
      const registryProjects = await searchNPMRegistry(projectName);
      const foundProject = registryProjects?.find(
        (project) => project.package.name === projectName,
      );
      if (foundProject) {
        form.setValue("projects", [...selectedProjects, projectName]);
      } else {
        toast.error(`Project "${projectName}" not found`);
      }
    }
    resetSearch();
  }

  async function searchMultipleProjects(projectNames: string[]) {
    const currentProjects = [...selectedProjects];
    const newProjects: string[] = [];
    const notFoundProjects: string[] = [];
    const duplicateProjects: string[] = [];

    const uniqueNewProjects = projectNames.filter(
      (name) => !currentProjects.includes(name),
    );

    if (
      currentProjects.length + uniqueNewProjects.length >
      SELECTED_PROJECTS_LIMIT
    ) {
      const allowedCount = SELECTED_PROJECTS_LIMIT - currentProjects.length;
      toast.error(
        `Cannot add ${uniqueNewProjects.length} projects. You can only add ${allowedCount} more projects (limit: ${SELECTED_PROJECTS_LIMIT})`,
      );
      return;
    }

    for (const projectName of projectNames) {
      if (!projectName) continue;

      if (
        currentProjects.includes(projectName) ||
        newProjects.includes(projectName)
      ) {
        duplicateProjects.push(projectName);
        continue;
      }

      try {
        const registryProjects = await searchNPMRegistry(projectName);
        const foundProject = registryProjects?.find(
          (project) => project.package.name === projectName,
        );

        if (foundProject) {
          newProjects.push(projectName);
        } else {
          notFoundProjects.push(projectName);
        }
      } catch (error) {
        notFoundProjects.push(projectName);
      }
    }

    if (newProjects.length > 0) {
      form.setValue("projects", [...currentProjects, ...newProjects]);
    }

    if (notFoundProjects.length > 0) {
      toast.error(`Projects not found: ${notFoundProjects.join(", ")}`);
    }

    if (duplicateProjects.length > 0) {
      toast.warning(
        `Projects already selected: ${duplicateProjects.join(", ")}`,
      );
    }

    resetSearch();
  }

  function onSubmit(data: ProjectsSearchFormValues) {
    const searchValue = data.search.trim();
    const valuesToSearch = parseSearchValue(searchValue);

    if (isSingleItemArray(valuesToSearch)) {
      return searchProject(valuesToSearch[0]);
    }
    return searchMultipleProjects(valuesToSearch);
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
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
    </Form>
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
