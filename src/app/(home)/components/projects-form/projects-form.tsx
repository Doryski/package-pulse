"use client";
import LocalStorageKey from "@/lib/enums/LocalStorageKey";
import useLocalStorage from "@/lib/hooks/useLocalStorage";
import { cn } from "@/lib/utils/cn";
import getLocalStorageValue from "@/lib/utils/getLocalStorageValue";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import {
  useInitialProjectsFromSearchParams,
  useUpdateSearchParams,
} from "../../utils/search-params";
import ComboboxForm from "../combobox-form";
import StatsSection from "../stats-section";
import { ProjectsSearchFormSchema, ProjectsSearchFormValues } from "./schema";

const PROJECTS_URL_DELIMITER = ",";

const ProjectsForm = () => {
  const initialProjects = useInitialProjectsFromSearchParams(
    PROJECTS_URL_DELIMITER,
  );

  const projectsSearchForm = useForm<ProjectsSearchFormValues>({
    resolver: zodResolver(ProjectsSearchFormSchema),
    defaultValues: ProjectsSearchFormSchema.parse({
      search: "",
      projects:
        initialProjects.length > 0
          ? initialProjects
          : getLocalStorageValue(
              LocalStorageKey.SELECTED_PROJECTS,
              ProjectsSearchFormSchema.shape.projects,
            ),
    }),
  });

  const selectedProjects = projectsSearchForm.watch("projects");
  useLocalStorage(LocalStorageKey.SELECTED_PROJECTS, selectedProjects);
  useUpdateSearchParams(selectedProjects, PROJECTS_URL_DELIMITER);

  return (
    <div
      className={cn(
        selectedProjects.length > 0 &&
          "flex flex-col h-full justify-center py-4",
        selectedProjects.length === 0 &&
          "flex flex-col h-full justify-center max-w-full absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
      )}
    >
      <ComboboxForm form={projectsSearchForm} />
      <StatsSection
        form={projectsSearchForm}
        selectedProjects={selectedProjects}
      />
    </div>
  );
};

export default ProjectsForm;
