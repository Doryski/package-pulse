"use client";
import { Button } from "@/components/ui/button";
import ClientOnly from "@/components/ui/client-only";
import useFavorites from "@/lib/hooks/useFavorites";
import { packageInfoQueryOptions } from "@/lib/queries/usePackagesInfo";
import { CreateGlobalComparisonRequest } from "@/lib/types/global-comparison";
import { cn } from "@/lib/utils/cn";
import { QueryClient, useQueryClient } from "@tanstack/react-query";
import { Star } from "lucide-react";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { isSingleItemArray } from "../../utils/array-utils";
import { useUpdateSearchParamsProjects } from "../../utils/search-params";
import ComboboxForm from "../combobox-form";
import LatestComparisons from "../latest-comparisons";
import PopularComparisons from "../popular-comparisons";
import QuickComparisons from "../quick-comparisons";
import ChartSkeleton from "../chart-skeleton";
import SavedComparisons from "../saved-comparisons";
import SimilarProjects from "../similar-projects";
import { ProjectsSearchFormValues } from "./schema";

const StatsSection = dynamic(() => import("../stats-section"), {
  loading: ChartSkeleton,
});

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

const TRACK_COMPARISON_DELAY_MS = 2000;

const haveProjectsChanged = (current: string[], previous: string[]) => {
  if (current.length !== previous.length) return true;
  const previousSet = new Set(previous);
  return current.some((project) => !previousSet.has(project));
};

function useTrackComparison(projects: string[]) {
  const trackedProjectsRef = useRef<string[]>([]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (!haveProjectsChanged(projects, trackedProjectsRef.current)) return;
      trackedProjectsRef.current = projects;
      void trackComparison(projects);
    }, TRACK_COMPARISON_DELAY_MS);

    return () => clearTimeout(timeoutId);
  }, [projects]);
}

function parseSearchValue(searchValue: string): string[] {
  return searchValue
    .split(",")
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
}

const partitionProjectNames = (
  projectNames: string[],
  currentProjects: string[],
) => {
  const seen = new Set(currentProjects);
  const candidates: string[] = [];
  const duplicates: string[] = [];
  projectNames.forEach((projectName) => {
    if (seen.has(projectName)) {
      duplicates.push(projectName);
      return;
    }
    seen.add(projectName);
    candidates.push(projectName);
  });
  return { candidates, duplicates };
};

const packageExists = (queryClient: QueryClient, projectName: string) =>
  queryClient.fetchQuery(packageInfoQueryOptions(projectName)).then(
    () => true,
    () => false,
  );

const findExistingProjects = async (
  queryClient: QueryClient,
  projectNames: string[],
) => {
  const exists = await Promise.all(
    projectNames.map((projectName) => packageExists(queryClient, projectName)),
  );
  return {
    found: projectNames.filter((_, index) => exists[index]),
    missing: projectNames.filter((_, index) => !exists[index]),
  };
};

const formatNames = (names: string[]) => names.join(", ");

const SAVE_BUTTON_ROW_CLASS_NAME = "mt-3 flex justify-end";

type SaveComparisonButtonProps = {
  projects: string[];
};

const SaveComparisonButton = ({ projects }: SaveComparisonButtonProps) => {
  const { toggleFavorite, isFavorite } = useFavorites();
  const isSaved = isFavorite(projects);

  return (
    <Button
      variant="ghost"
      size="sm"
      aria-pressed={isSaved}
      onClick={() => toggleFavorite(projects)}
    >
      <Star className={cn("mr-2 size-4", isSaved && "fill-current")} />
      {isSaved ? "Saved" : "Save comparison"}
    </Button>
  );
};

const SaveComparisonButtonFallback = () => (
  <div
    aria-hidden="true"
    data-testid="save-comparison-fallback"
    className="h-8"
  />
);

const ProjectsForm = () => {
  const projectsSearchForm = useFormContext<ProjectsSearchFormValues>();
  const queryClient = useQueryClient();
  const { control, getValues, setValue, setFocus } = projectsSearchForm;
  const selectedProjects = useWatch({ control, name: "projects" });
  const hasSelection = selectedProjects.length > 0;

  useUpdateSearchParamsProjects(selectedProjects, PROJECTS_URL_DELIMITER);
  useTrackComparison(selectedProjects);

  const focusSearch = useCallback(() => setFocus("search"), [setFocus]);

  const handleAddProject = useCallback(
    (projectName: string) => {
      const currentProjects = getValues("projects");
      if (!currentProjects.includes(projectName)) {
        setValue("projects", [...currentProjects, projectName]);
      }
      focusSearch();
    },
    [getValues, setValue, focusSearch],
  );

  const handleAddMultipleProjects = useCallback(
    (projectNames: string[]) => {
      const currentProjects = getValues("projects");
      const newProjects = projectNames
        .filter((project, index, all) => all.indexOf(project) === index)
        .filter((project) => !currentProjects.includes(project));

      if (newProjects.length > 0) {
        setValue("projects", [...currentProjects, ...newProjects]);
      }
      focusSearch();
    },
    [getValues, setValue, focusSearch],
  );

  const searchProject = useCallback(
    async (projectName: string) => {
      if (!getValues("projects").includes(projectName)) {
        const isFound = await packageExists(queryClient, projectName);
        if (isFound) {
          setValue("projects", [...getValues("projects"), projectName]);
        } else {
          toast.error(`Project "${projectName}" not found`);
        }
      }
      setValue("search", "");
    },
    [getValues, setValue, queryClient],
  );

  const searchMultipleProjects = useCallback(
    async (projectNames: string[]) => {
      const { candidates, duplicates } = partitionProjectNames(
        projectNames,
        getValues("projects"),
      );
      const { found, missing } = await findExistingProjects(
        queryClient,
        candidates,
      );

      if (found.length > 0) {
        setValue("projects", [...getValues("projects"), ...found]);
      }

      if (missing.length > 0) {
        toast.error(`Projects not found: ${formatNames(missing)}`);
      }

      if (duplicates.length > 0) {
        toast.warning(`Projects already selected: ${formatNames(duplicates)}`);
      }

      setValue("search", "");
    },
    [getValues, setValue, queryClient],
  );

  const handleSearch = useCallback(
    async (query: string) => {
      const valuesToSearch = parseSearchValue(query);

      if (!isSingleItemArray(valuesToSearch)) {
        await searchMultipleProjects(valuesToSearch);
        return;
      }

      const [firstValue] = valuesToSearch;
      if (firstValue) await searchProject(firstValue);
    },
    [searchMultipleProjects, searchProject],
  );

  return (
    <div className="flex h-full flex-col justify-center py-4">
      <ComboboxForm form={projectsSearchForm} onFormSubmit={handleSearch} />
      {hasSelection && (
        <div className={SAVE_BUTTON_ROW_CLASS_NAME}>
          <ClientOnly fallback={<SaveComparisonButtonFallback />}>
            <SaveComparisonButton projects={selectedProjects} />
          </ClientOnly>
        </div>
      )}
      <SavedComparisons
        selectedProjects={selectedProjects}
        onAddMultipleProjects={handleAddMultipleProjects}
        onFavoriteRemoved={focusSearch}
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
      {hasSelection && (
        <StatsSection
          form={projectsSearchForm}
          selectedProjects={selectedProjects}
        />
      )}
    </div>
  );
};

export default ProjectsForm;
