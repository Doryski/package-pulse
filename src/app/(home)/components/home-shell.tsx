"use client";

import ProjectsForm from "@/app/(home)/components/projects-form";
import SelectionHeading from "@/app/(home)/components/selection-heading";
import {
  ProjectsSearchFormSchema,
  ProjectsSearchFormValues,
} from "@/app/(home)/components/projects-form/schema";
import LocalStorageKey from "@/lib/enums/LocalStorageKey";
import safeParse from "@/lib/utils/safeParse";
import { zodResolver } from "@hookform/resolvers/zod";
import { ReactNode, useEffect } from "react";
import { FormProvider, useForm, useWatch } from "react-hook-form";

type HomeShellProps = {
  initialProjects: string[];
  persistSelection?: boolean;
  hero?: ReactNode;
  sections?: ReactNode;
  selectionHeading?: boolean;
};

export default function HomeShell({
  initialProjects,
  persistSelection = true,
  hero,
  sections,
  selectionHeading = false,
}: HomeShellProps) {
  const projectsSearchForm = useForm<ProjectsSearchFormValues>({
    resolver: zodResolver(ProjectsSearchFormSchema),
    defaultValues: safeParse(
      {
        search: "",
        projects: initialProjects,
      },
      ProjectsSearchFormSchema,
    ),
  });

  const selectedProjects = useWatch({
    control: projectsSearchForm.control,
    name: "projects",
  });
  const isSearchActive = selectedProjects.length > 0;

  useEffect(() => {
    if (!persistSelection) return;
    localStorage.setItem(
      LocalStorageKey.SELECTED_PROJECTS,
      JSON.stringify(selectedProjects),
    );
  }, [persistSelection, selectedProjects]);

  return (
    <FormProvider {...projectsSearchForm}>
      <div className="mt-8 space-y-20">
        {!isSearchActive && hero}
        {selectionHeading ? (
          <div className="space-y-6">
            <SelectionHeading projects={selectedProjects} />
            <ProjectsForm />
          </div>
        ) : (
          <ProjectsForm />
        )}
        {!isSearchActive && sections}
      </div>
    </FormProvider>
  );
}
