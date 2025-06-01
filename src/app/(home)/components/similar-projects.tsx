"use client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { SELECTED_PROJECTS_LIMIT } from "@/lib/config/constants";
import usePackagesInfo from "@/lib/queries/usePackagesInfo";
import useSimilarProjects from "@/lib/queries/useSimilarProjects";
import { Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type SimilarProjectsProps = {
  selectedProjects: string[];
  onAddProject: (projectName: string) => void;
};

const SimilarProjects = ({
  selectedProjects,
  onAddProject,
}: SimilarProjectsProps) => {
  const [removedProjects, setRemovedProjects] = useState<Set<string>>(
    new Set(),
  );

  useEffect(() => {
    if (selectedProjects.length === 0) {
      setRemovedProjects(new Set());
    }
  }, [selectedProjects.length]);

  const packagesInfo = usePackagesInfo(selectedProjects);
  const validPackagesInfo = useMemo(
    () => packagesInfo.map((info) => info.data).filter((info) => info != null),
    [packagesInfo],
  );

  const similarProjectsQuery = useSimilarProjects(validPackagesInfo);

  const filteredSimilarProjects = useMemo(() => {
    if (!similarProjectsQuery.data) return [];

    return similarProjectsQuery.data.filter(
      (project) =>
        !selectedProjects.includes(project) && !removedProjects.has(project),
    );
  }, [similarProjectsQuery.data, selectedProjects, removedProjects]);

  const handleAddProject = (projectName: string) => {
    if (selectedProjects.length >= SELECTED_PROJECTS_LIMIT) {
      toast.error(
        `You can select a maximum of ${SELECTED_PROJECTS_LIMIT} projects`,
      );
      return;
    }

    onAddProject(projectName);
    setRemovedProjects((prev) => new Set([...prev, projectName]));
  };

  if (!selectedProjects.length) {
    return null;
  }

  const showLoading =
    similarProjectsQuery.isLoading &&
    !similarProjectsQuery.data &&
    filteredSimilarProjects.length === 0;

  const showNoResults =
    !similarProjectsQuery.isLoading && filteredSimilarProjects.length === 0;

  return (
    <section className="mt-4">
      <h2 className="text-lg">Similar projects</h2>
      <div className="mt-2">
        {showLoading && (
          <ul className="flex flex-wrap gap-2">
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} className="h-8 w-20" />
            ))}
          </ul>
        )}
        {filteredSimilarProjects.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {filteredSimilarProjects.map((similarProject) => (
              <Button
                key={similarProject}
                variant="outline"
                size="sm"
                className="flex items-center gap-1 px-2"
                onClick={() => handleAddProject(similarProject)}
                disabled={
                  selectedProjects.includes(similarProject) ||
                  similarProjectsQuery.isLoading ||
                  selectedProjects.length >= SELECTED_PROJECTS_LIMIT
                }
              >
                <Plus className="size-4" />
                <span>{similarProject}</span>
              </Button>
            ))}
          </div>
        )}
        {showNoResults && (
          <p className="text-sm text-muted-foreground">
            No similar projects found.
          </p>
        )}
      </div>
    </section>
  );
};

export default SimilarProjects;
