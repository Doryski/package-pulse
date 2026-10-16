"use client";

import { Button } from "@/components/ui/button";
import ClientOnly from "@/components/ui/client-only";
import useFavorites from "@/lib/hooks/useFavorites";
import { X } from "lucide-react";
import ComparisonCard from "./comparison-card";

type SavedComparisonsProps = {
  selectedProjects: string[];
  onAddMultipleProjects: (projectNames: string[]) => void;
  onFavoriteRemoved: () => void;
};

const SavedComparisonsContent = ({
  selectedProjects,
  onAddMultipleProjects,
  onFavoriteRemoved,
}: SavedComparisonsProps) => {
  const { favorites, removeFavorite } = useFavorites();

  if (selectedProjects.length > 0) {
    return null;
  }

  if (favorites.length === 0) {
    return null;
  }

  return (
    <section className="mt-6">
      <h2 className="mb-4 text-lg font-semibold">Saved comparisons</h2>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {favorites.map((projects) => (
          <ComparisonCard
            key={projects.join(",")}
            projects={projects}
            onProjectsClick={() => onAddMultipleProjects(projects)}
            title={projects.join(", ")}
            headerExtra={
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Remove saved comparison ${projects.join(", ")}`}
                onClick={(event) => {
                  event.stopPropagation();
                  removeFavorite(projects);
                  onFavoriteRemoved();
                }}
              >
                <X className="size-4" />
              </Button>
            }
          />
        ))}
      </div>
    </section>
  );
};

const SavedComparisons = (props: SavedComparisonsProps) => {
  return (
    <ClientOnly>
      <SavedComparisonsContent {...props} />
    </ClientOnly>
  );
};

export default SavedComparisons;
