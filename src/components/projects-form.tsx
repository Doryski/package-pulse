"use client";
import LocalStorageKey from "@/lib/enums/LocalStorageKey";
import useLocalStorage from "@/lib/hooks/useLocalStorage";
import getLocalStorageValue from "@/lib/utils/getLocalStorageValue";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { ComboboxForm } from "./combobox-form";
import {
  ProjectsSearchFormSchema,
  ProjectsSearchFormValues,
} from "./projects-form/utils";
import StatsSection from "./stats-section";

const ProjectsForm = () => {
  const projectsSearchForm = useForm<ProjectsSearchFormValues>({
    resolver: zodResolver(ProjectsSearchFormSchema),
    defaultValues: ProjectsSearchFormSchema.parse({
      search: "",
      projects: getLocalStorageValue(
        LocalStorageKey.SELECTED_PROJECTS,
        ProjectsSearchFormSchema.shape.projects,
      ),
    }),
  });
  const selectedProjects = projectsSearchForm.watch("projects");
  useLocalStorage(LocalStorageKey.SELECTED_PROJECTS, selectedProjects);

  return (
    <>
      <ComboboxForm form={projectsSearchForm} />
      <StatsSection selectedProjects={selectedProjects} />
    </>
  );
};

export default ProjectsForm;
