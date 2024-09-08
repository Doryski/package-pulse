"use client";
import ClientOnly from "@/components/ui/client-only";
import { Combobox } from "@/components/ui/combobox";
import { Form, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { MAX_SELECTED_PROJECTS } from "@/lib/config/constants";
import { cn } from "@/lib/utils/cn";
import { UseFormReturn } from "react-hook-form";
import ProjectTag from "./project-tag";
import { ProjectsSearchFormValues } from "./projects-form/schema";

type ComboboxFormProps = {
  form: UseFormReturn<ProjectsSearchFormValues>;
};

const ComboboxForm = ({ form }: ComboboxFormProps) => {
  const selectedProjects = form.watch("projects");

  function onSubmit(_data: ProjectsSearchFormValues) {}

  const hasExceededSelectedProjectsLimit =
    selectedProjects.length >= MAX_SELECTED_PROJECTS;

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-col gap-4"
      >
        <div className="flex w-full flex-col items-start gap-2 sm:flex-row sm:items-center">
          <Combobox form={form} disabled={hasExceededSelectedProjectsLimit} />
          {hasExceededSelectedProjectsLimit && (
            <FormMessage className="text-xs text-destructive">
              You cannot select more than {MAX_SELECTED_PROJECTS} projects
            </FormMessage>
          )}
        </div>

        <FormField
          control={form.control}
          name="projects"
          render={({ field }) => (
            <FormItem className={cn(selectedProjects.length === 0 && "hidden")}>
              <div className="flex flex-wrap gap-2">
                {field.value.map((project) => (
                  <ClientOnly key={project}>
                    <ProjectTag
                      project={project}
                      colorIndex={field.value.indexOf(project)}
                      onRemove={() =>
                        form.setValue(
                          "projects",
                          field.value.filter((p) => p !== project),
                        )
                      }
                    />
                  </ClientOnly>
                ))}
              </div>
            </FormItem>
          )}
        />
      </form>
    </Form>
  );
};

export default ComboboxForm;
