"use client";
import LocalStorageKey from "@/lib/enums/LocalStorageKey";
import useLocalStorage from "@/lib/hooks/useLocalStorage";
import { cn } from "@/lib/utils/cn";
import safeParse from "@/lib/utils/safeParse";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormProvider, useForm } from "react-hook-form";
import {
  useInitialProjectsFromSearchParams,
  useUpdateSearchParams,
} from "../../utils/search-params";
import ComboboxForm from "../combobox-form";
import SimilarProjects from "../similar-projects";
import StatsSection from "../stats-section";
import { ProjectsSearchFormSchema, ProjectsSearchFormValues } from "./schema";

const PROJECTS_URL_DELIMITER = ",";

const ProjectsForm = () => {
  const initialProjects = useInitialProjectsFromSearchParams(
    PROJECTS_URL_DELIMITER,
  );

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

  const selectedProjects = projectsSearchForm.watch("projects");
  useLocalStorage(LocalStorageKey.SELECTED_PROJECTS, selectedProjects);
  useUpdateSearchParams(selectedProjects, PROJECTS_URL_DELIMITER);

  const handleAddProject = (projectName: string) => {
    if (!selectedProjects.includes(projectName)) {
      projectsSearchForm.setValue("projects", [
        ...selectedProjects,
        projectName,
      ]);
    }
  };

  return (
    <FormProvider {...projectsSearchForm}>
      <div
        className={cn(
          selectedProjects.length > 0 &&
            "flex flex-col h-full justify-center py-4",
          selectedProjects.length === 0 &&
            "flex flex-col h-full justify-center max-w-full absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full sm:w-auto",
        )}
      >
        <ComboboxForm form={projectsSearchForm} />
        <SimilarProjects
          selectedProjects={selectedProjects}
          onAddProject={handleAddProject}
        />
        <StatsSection
          form={projectsSearchForm}
          selectedProjects={selectedProjects}
        />
      </div>
    </FormProvider>
  );
};

export default ProjectsForm;
