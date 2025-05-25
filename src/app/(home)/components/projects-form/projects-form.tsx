"use client";
import LocalStorageKey from "@/lib/enums/LocalStorageKey";
import useLocalStorage from "@/lib/hooks/useLocalStorage";
import usePackagesInfo from "@/lib/queries/usePackagesInfo";
import useSimilarProjects from "@/lib/queries/useSimilarProjects";
import safeParse from "@/lib/utils/safeParse";
import { zodResolver } from "@hookform/resolvers/zod";
import { isEqual as isEqualLodash } from "lodash";
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

function isEqual<T>(a: T, b: T): boolean {
  return isEqualLodash(a, b);
}

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
    if (
      similarProjects.data &&
      similarProjectsState.length === 0 &&
      !isEqual(similarProjects.data, similarProjectsState)
    ) {
      setSimilarProjectsState(similarProjects.data);
    }
  }, [similarProjects.data]);

  useEffect(() => {
    if (selectedProjects.length > 0 && similarProjectsState.length <= 2) {
      similarProjects.refetch();
    }
  }, [selectedProjects, similarProjectsState.length]);

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
