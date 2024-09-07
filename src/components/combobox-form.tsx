"use client";
import { Form, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { MAX_SELECTED_PROJECTS } from "@/lib/config/constants";
import { UseFormReturn } from "react-hook-form";
import ClientOnly from "./client-only";
import ProjectTag from "./project-tag";
import { ProjectsSearchFormValues } from "./projects-form/utils";
import { Combobox } from "./ui/combobox";

type ComboboxFormProps = {
  form: UseFormReturn<ProjectsSearchFormValues>;
};

export function ComboboxForm({ form }: ComboboxFormProps) {
  const selectedProjects = form.watch("projects");

  function onSubmit(_data: ProjectsSearchFormValues) {}

  const hasExceededSelectedProjectsLimit =
    selectedProjects.length >= MAX_SELECTED_PROJECTS;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center">
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
            <FormItem>
              <div className="flex flex-wrap gap-2">
                {field.value.map((project, idx) => (
                  <ClientOnly key={project}>
                    <ProjectTag
                      project={project}
                      colorIndex={idx + 1}
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
}
