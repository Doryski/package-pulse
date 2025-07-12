"use client";

import useLatestComparisons from "@/lib/queries/useLatestComparisons";
import { GlobalComparison } from "@/lib/types/global-comparison";
import ComparisonCard, { ComparisonCardSkeleton } from "./comparison-card";

type LatestComparisonsProps = {
  selectedProjects: string[];
  onAddMultipleProjects: (projectNames: string[]) => void;
};

const LatestComparisons = ({
  selectedProjects,
  onAddMultipleProjects,
}: LatestComparisonsProps) => {
  const latestComparisons = useLatestComparisons();

  if (selectedProjects.length > 0) {
    return null;
  }

  const handleComparisonClick = (comparison: GlobalComparison) => {
    if (comparison.projects.length > 0) {
      onAddMultipleProjects(comparison.projects);
    }
  };

  const _formatTimeAgo = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return "just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  if (latestComparisons.error || !latestComparisons.data?.comparisons.length) {
    return null;
  }

  return (
    <section className="mt-6">
      <h2 className="mb-4 text-lg font-semibold">
        Latest Searches or Comparisons
      </h2>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {latestComparisons.isLoading
          ? [...Array(6)].map((_, index) => (
              <ComparisonCardSkeleton key={index} projectCount={2} />
            ))
          : latestComparisons.data?.comparisons.map((comparison) => (
              <ComparisonCard
                key={comparison.id}
                projects={comparison.projects}
                onProjectsClick={() => handleComparisonClick(comparison)}
                // title={formatTimeAgo(comparison.timestamp)}
                title={""}
              />
            ))}
      </div>
    </section>
  );
};

export default LatestComparisons;
