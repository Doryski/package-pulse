"use client";
import { Button } from "@/components/ui/button";
import { MAX_SELECTED_PROJECTS } from "@/lib/config/constants";
import { fetchSimilarProjects } from "@/lib/utils/fetchSimilarProjects";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { toast } from "sonner";

type SimilarProjectsProps = {
  selectedProjects: string[];
  onAddProject: (projectName: string) => void;
};

const SimilarProjects = ({
  selectedProjects,
  onAddProject,
}: SimilarProjectsProps) => {
  const similarProjects = useQuery<string[], Error>({
    queryKey: ["similarProjects", selectedProjects],
    queryFn: () => fetchSimilarProjects(selectedProjects),
    enabled: selectedProjects.length > 0,
    staleTime: 1000 * 60 * 60 * 24, // 24 hours
  });

  if (!selectedProjects.length) {
    return null;
  }

  return (
    <section className="mt-4">
      <h2 className="text-lg">Similar projects</h2>
      <div className="mt-2">
        {similarProjects.isLoading && (
          <div className="flex justify-center py-4">
            <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        )}
        {similarProjects.data && similarProjects.data.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {similarProjects.data.map((similarProject) => (
              <Button
                key={similarProject}
                variant="outline"
                size="sm"
                className="flex items-center gap-1 px-2"
                onClick={() => {
                  if (selectedProjects.length >= MAX_SELECTED_PROJECTS) {
                    toast.error(
                      `You can select a maximum of ${MAX_SELECTED_PROJECTS} projects`,
                    );
                    return;
                  }
                  onAddProject(similarProject);
                }}
                disabled={
                  selectedProjects.includes(similarProject) ||
                  similarProjects.isLoading ||
                  selectedProjects.length >= MAX_SELECTED_PROJECTS
                }
              >
                <Plus className="size-4" />
                <span>{similarProject}</span>
              </Button>
            ))}
          </div>
        )}
        {!similarProjects.isLoading && !similarProjects.data && (
          <p className="text-sm text-muted-foreground">
            No similar projects found. Try selecting other projects.
          </p>
        )}
      </div>
    </section>
  );
};

export default SimilarProjects;
