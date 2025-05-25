"use client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { SELECTED_PROJECTS_LIMIT } from "@/lib/config/constants";
import usePackagesInfo from "@/lib/queries/usePackagesInfo";
import useSimilarProjects from "@/lib/queries/useSimilarProjects";
import { Plus } from "lucide-react";
import { toast } from "sonner";

type SimilarProjectsProps = {
  selectedProjects: string[];
  similarProjects: string[];
  onAddProject: (projectName: string) => void;
};

const SimilarProjects = ({
  selectedProjects,
  similarProjects,
  onAddProject,
}: SimilarProjectsProps) => {
  const packagesInfo = usePackagesInfo(selectedProjects);
  const similarProjectsQuery = useSimilarProjects(
    packagesInfo.map((info) => info.data).filter((info) => info != null),
  );

  if (!selectedProjects.length) {
    return null;
  }

  const filteredSimilarProjects = similarProjects.filter(
    (project) => !selectedProjects.includes(project),
  );

  return (
    <section className="mt-4">
      <h2 className="text-lg">Similar projects</h2>
      <div className="mt-2">
        {similarProjectsQuery.isLoading &&
          !similarProjectsQuery.data &&
          similarProjects.length === 0 && (
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
                onClick={() => {
                  if (selectedProjects.length >= SELECTED_PROJECTS_LIMIT) {
                    toast.error(
                      `You can select a maximum of ${SELECTED_PROJECTS_LIMIT} projects`,
                    );
                    return;
                  }
                  onAddProject(similarProject);
                }}
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
        {!similarProjectsQuery.isLoading &&
          filteredSimilarProjects.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No similar projects found. Try selecting other projects.
            </p>
          )}
      </div>
    </section>
  );
};

export default SimilarProjects;
