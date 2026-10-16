"use client";

import usePopularComparisons from "@/lib/queries/usePopularComparisons";
import { memo } from "react";
import ComparisonCard from "./comparison-card";
import ComparisonsFeedSection, {
  ComparisonsFeedSkeleton,
} from "./comparisons-feed-section";

const TITLE = "Popular Searches or Comparisons";

type PopularComparisonsProps = {
  selectedProjects: string[];
  onAddMultipleProjects: (projectNames: string[]) => void;
};

const PopularComparisons = ({
  selectedProjects,
  onAddMultipleProjects,
}: PopularComparisonsProps) => {
  const hasSelection = selectedProjects.length > 0;
  const popularComparisons = usePopularComparisons({ enabled: !hasSelection });

  if (hasSelection) return null;

  if (popularComparisons.isLoading) {
    return <ComparisonsFeedSkeleton title={TITLE} projectCount={3} />;
  }

  const comparisons = popularComparisons.data?.comparisons;

  if (popularComparisons.error || !comparisons?.length) return null;

  return (
    <ComparisonsFeedSection title={TITLE}>
      {comparisons.map((comparison) => (
        <ComparisonCard
          key={comparison.projects.join(",")}
          projects={comparison.projects}
          onProjectsClick={onAddMultipleProjects}
          title=""
        />
      ))}
    </ComparisonsFeedSection>
  );
};

export default memo(PopularComparisons);
