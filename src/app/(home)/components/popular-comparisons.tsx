"use client";

import usePopularComparisons from "@/lib/queries/usePopularComparisons";
import { PopularComparison } from "@/lib/types/global-comparison";
import ComparisonCard, { ComparisonCardSkeleton } from "./comparison-card";

type PopularComparisonsProps = {
  selectedProjects: string[];
  onAddMultipleProjects: (projectNames: string[]) => void;
};

const PopularComparisons = ({
  selectedProjects,
  onAddMultipleProjects,
}: PopularComparisonsProps) => {
  const popularComparisons = usePopularComparisons();

  if (selectedProjects.length > 0) {
    return null;
  }

  const handleComparisonClick = (comparison: PopularComparison) => {
    onAddMultipleProjects(comparison.projects);
  };

  if (
    popularComparisons.error ||
    !popularComparisons.data?.comparisons.length
  ) {
    return null;
  }

  return (
    <section className="mt-6">
      <h2 className="mb-4 text-lg font-semibold">
        Popular Searches or Comparisons
      </h2>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {popularComparisons.isLoading
          ? [...Array(6)].map((_, index) => (
              <ComparisonCardSkeleton key={index} projectCount={3} />
            ))
          : popularComparisons.data?.comparisons.map((comparison) => (
              <ComparisonCard
                key={comparison.projects.join(",")}
                projects={comparison.projects}
                onProjectsClick={() => handleComparisonClick(comparison)}
                title={""}
              />
            ))}
      </div>
    </section>
  );
};

export default PopularComparisons;
