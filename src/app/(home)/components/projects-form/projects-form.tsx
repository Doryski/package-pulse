"use client";
import LocalStorageKey from "@/lib/enums/LocalStorageKey";
import useLocalStorage from "@/lib/hooks/useLocalStorage";
import usePackagesInfo from "@/lib/queries/usePackagesInfo";
import useSimilarProjects from "@/lib/queries/useSimilarProjects";
import safeParse from "@/lib/utils/safeParse";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
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
  const packagesInfo = usePackagesInfo(selectedProjects);
  const similarProjects = useSimilarProjects(
    packagesInfo.map((info) => info.data).filter((info) => info != null),
  );
  const [similarProjectsState, setSimilarProjectsState] = useState<string[]>(
    [],
  );

  useEffect(() => {
    async function updateSimilarProjects() {
      if (selectedProjects.length > 0 && similarProjectsState.length <= 2) {
        await similarProjects.refetch();
        if (similarProjects.data) {
          setSimilarProjectsState(similarProjects.data);
        }
      }
    }

    updateSimilarProjects();
  }, [selectedProjects.length, similarProjects, similarProjectsState.length]);

  const handleAddProject = (projectName: string) => {
    if (!selectedProjects.includes(projectName)) {
      projectsSearchForm.setValue("projects", [
        ...selectedProjects,
        projectName,
      ]);
      setSimilarProjectsState((prev) => prev.filter((p) => p !== projectName));
    }
  };

  return (
    <FormProvider {...projectsSearchForm}>
      <div className="flex h-full flex-col justify-center py-4">
        <ComboboxForm form={projectsSearchForm} />
        <SimilarProjects
          selectedProjects={selectedProjects}
          similarProjects={similarProjectsState}
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
