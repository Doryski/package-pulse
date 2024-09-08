"use client";
import LocalStorageKey from "@/lib/enums/LocalStorageKey";
import useLocalStorage from "@/lib/hooks/useLocalStorage";
import getLocalStorageValue from "@/lib/utils/getLocalStorageValue";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import {
  useInitialProjectsFromSearchParams,
  useUpdateSearchParams,
} from "../../utils/search-params";
import { ComboboxForm } from "../combobox-form";
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
    <>
      <ComboboxForm form={projectsSearchForm} />
      <StatsSection selectedProjects={selectedProjects} />
    </>
  );
};

export default ProjectsForm;
