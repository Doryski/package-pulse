"use client";
import searchNPMRegistry from "@/api/searchNpmRegistry";
import ClientOnly from "@/components/ui/client-only";
import { Combobox } from "@/components/ui/combobox";
import { Form, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { MAX_SELECTED_PROJECTS } from "@/lib/config/constants";
import useDebounce from "@/lib/hooks/useDebounce";
import useSearchNPMRegistryQuery from "@/lib/queries/useSearchNPMRegistryQuery";
import { cn } from "@/lib/utils/cn";
import { UseFormReturn } from "react-hook-form";
import { toast } from "sonner";
import ProjectTag from "./project-tag";
import { ProjectsSearchFormValues } from "./projects-form/schema";

type ComboboxFormProps = {
  form: UseFormReturn<ProjectsSearchFormValues>;
};

const ComboboxForm = ({ form }: ComboboxFormProps) => {
  const search = form.watch("search");
  const debouncedSearch = useDebounce(search, 400);
  const npmRegistry = useSearchNPMRegistryQuery(debouncedSearch);

  const selectedProjects = form.watch("projects");
  const hasExceededSelectedProjectsLimit =
    selectedProjects.length >= MAX_SELECTED_PROJECTS;

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

  function onSubmit(data: ProjectsSearchFormValues) {
    searchProject(data.search);
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-col gap-4"
      >
        <div className="flex w-full flex-col items-start gap-2">
          <Combobox
            fullwidth={selectedProjects.length > 0}
            options={npmRegistry.data}
            isLoadingOptions={npmRegistry.isLoading}
            form={form}
            disabled={hasExceededSelectedProjectsLimit}
            onSelectItem={selectProject}
            optionValuePredicate={(option) => option.package.name}
          />
          {hasExceededSelectedProjectsLimit && (
            <FormMessage className="text-xs text-destructive">
              You cannot select more than {MAX_SELECTED_PROJECTS} projects
            </FormMessage>
          )}
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
              </div>
            </FormItem>
          )}
        />
      </form>
    </Form>
  );
};

export default ComboboxForm;
