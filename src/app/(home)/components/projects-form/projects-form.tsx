"use client";
import searchNPMRegistry from "@/api/searchNpmRegistry";
import { Button } from "@/components/ui/button";
import ClientOnly from "@/components/ui/client-only";
import useFavorites from "@/lib/hooks/useFavorites";
import { CreateGlobalComparisonRequest } from "@/lib/types/global-comparison";
import { cn } from "@/lib/utils/cn";
import { Star } from "lucide-react";
import { useEffect, useRef } from "react";
import { useFormContext } from "react-hook-form";
import { toast } from "sonner";
import { isSingleItemArray } from "../../utils/array-utils";
import { useUpdateSearchParamsProjects } from "../../utils/search-params";
import ComboboxForm from "../combobox-form";
import LatestComparisons from "../latest-comparisons";
import PopularComparisons from "../popular-comparisons";
import QuickComparisons from "../quick-comparisons";
import SavedComparisons from "../saved-comparisons";
import SimilarProjects from "../similar-projects";
import StatsSection from "../stats-section";
import { ProjectsSearchFormValues } from "./schema";

const PROJECTS_URL_DELIMITER = ",";

async function trackComparison(projects: string[]) {
  if (projects.length === 0) return;

  try {
    const requestBody: CreateGlobalComparisonRequest = {
      projects,
    };

    const response = await fetch("/api/comparisons", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (response.ok) {
      const result = await response.json();

      if (result.validation) {
        if (result.validation.invalidPackages.length > 0) {
          console.warn(
            `Some packages were filtered out: ${result.validation.invalidPackages.join(", ")}`,
          );
        }
        console.info(result.validation.message);
      }
    } else {
      console.error("Failed to track comparison.");
    }
  } catch (_error) {
    console.error("Failed to track comparison.");
  }
}

const haveProjectsChanged = (current: string[], previous: string[]) => {
  if (current.length !== previous.length) return true;
  const previousSet = new Set(previous);
  return current.some((project) => !previousSet.has(project));
};

function parseSearchValue(searchValue: string): string[] {
  return searchValue
    .split(",")
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
}

const ProjectsForm = () => {
  const projectsSearchForm = useFormContext<ProjectsSearchFormValues>();
  const selectedProjects = projectsSearchForm.watch("projects");
  const previousProjectsRef = useRef<string[]>([]);
  const { toggleFavorite, isFavorite } = useFavorites();
  const isSaved = isFavorite(selectedProjects);

  useUpdateSearchParamsProjects(selectedProjects, PROJECTS_URL_DELIMITER);

  useEffect(() => {
    const previousProjects = previousProjectsRef.current;

    if (
      selectedProjects.length > 0 &&
      haveProjectsChanged(selectedProjects, previousProjects)
    ) {
      trackComparison(selectedProjects);
    }

    previousProjectsRef.current = selectedProjects;
  }, [selectedProjects]);

  const handleAddProject = (projectName: string) => {
    if (!selectedProjects.includes(projectName)) {
      projectsSearchForm.setValue("projects", [
        ...selectedProjects,
        projectName,
      ]);
    }
  };

  const handleAddMultipleProjects = (projectNames: string[]) => {
    const newProjects = projectNames
      .filter((project, index, all) => all.indexOf(project) === index)
      .filter((project) => !selectedProjects.includes(project));

    if (newProjects.length > 0) {
      const updatedProjects = [...selectedProjects, ...newProjects];
      projectsSearchForm.setValue("projects", updatedProjects);
    }
  };

  const handleSearch = async (query: string) => {
    const valuesToSearch = parseSearchValue(query);

    if (isSingleItemArray(valuesToSearch)) {
      const firstValue = valuesToSearch[0];
      if (firstValue) {
        await searchProject(firstValue);
      }
    } else {
      await searchMultipleProjects(valuesToSearch);
    }
  };

  const searchProject = async (projectName: string) => {
    if (!selectedProjects.includes(projectName)) {
      const registryProjects = await searchNPMRegistry(projectName);
      const foundProject = registryProjects?.find(
        (project) => project.package.name === projectName,
      );
      if (foundProject) {
        projectsSearchForm.setValue("projects", [
          ...selectedProjects,
          projectName,
        ]);
      } else {
        toast.error(`Project "${projectName}" not found`);
      }
    }
    projectsSearchForm.setValue("search", "");
  };

  const searchMultipleProjects = async (projectNames: string[]) => {
    const currentProjects = [...selectedProjects];
    const newProjects: string[] = [];
    const notFoundProjects: string[] = [];
    const duplicateProjects: string[] = [];

    for (const projectName of projectNames) {
      if (!projectName) continue;

      if (
        currentProjects.includes(projectName) ||
        newProjects.includes(projectName)
      ) {
        duplicateProjects.push(projectName);
        continue;
      }

      try {
        const registryProjects = await searchNPMRegistry(projectName);
        const foundProject = registryProjects?.find(
          (project) => project.package.name === projectName,
        );

        if (foundProject) {
          newProjects.push(projectName);
        } else {
          notFoundProjects.push(projectName);
        }
      } catch (_error) {
        notFoundProjects.push(projectName);
      }
    }

    if (newProjects.length > 0) {
      projectsSearchForm.setValue("projects", [
        ...currentProjects,
        ...newProjects,
      ]);
    }

    if (notFoundProjects.length > 0) {
      toast.error(`Projects not found: ${notFoundProjects.join(", ")}`);
    }

    if (duplicateProjects.length > 0) {
      toast.warning(
        `Projects already selected: ${duplicateProjects.join(", ")}`,
      );
    }

    projectsSearchForm.setValue("search", "");
  };

  return (
    <div className="flex h-full flex-col justify-center py-4">
      <ComboboxForm form={projectsSearchForm} onFormSubmit={handleSearch} />
      {selectedProjects.length > 0 && (
        <ClientOnly>
          <div className="mt-3 flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              aria-pressed={isSaved}
              onClick={() => toggleFavorite(selectedProjects)}
            >
              <Star className={cn("mr-2 size-4", isSaved && "fill-current")} />
              {isSaved ? "Saved" : "Save comparison"}
            </Button>
          </div>
        </ClientOnly>
      )}
      <SavedComparisons
        selectedProjects={selectedProjects}
        onAddMultipleProjects={handleAddMultipleProjects}
      />
      <QuickComparisons
        selectedProjects={selectedProjects}
        onAddMultipleProjects={handleAddMultipleProjects}
      />
      <PopularComparisons
        selectedProjects={selectedProjects}
        onAddMultipleProjects={handleAddMultipleProjects}
      />
      <LatestComparisons
        selectedProjects={selectedProjects}
        onAddMultipleProjects={handleAddMultipleProjects}
      />
      <SimilarProjects
        selectedProjects={selectedProjects}
        onAddProject={handleAddProject}
      />
      <StatsSection
        form={projectsSearchForm}
        selectedProjects={selectedProjects}
      />
    </div>
  );
};

export default ProjectsForm;
