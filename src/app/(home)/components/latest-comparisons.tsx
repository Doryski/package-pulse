"use client";

import useLatestComparisons from "@/lib/queries/useLatestComparisons";
import { memo, useCallback } from "react";
import ComparisonCard from "./comparison-card";
import ComparisonsFeedSection, {
  ComparisonsFeedSkeleton,
} from "./comparisons-feed-section";

const TITLE = "Latest Searches or Comparisons";

type LatestComparisonsProps = {
  selectedProjects: string[];
  onAddMultipleProjects: (projectNames: string[]) => void;
};

const LatestComparisons = ({
  selectedProjects,
  onAddMultipleProjects,
}: LatestComparisonsProps) => {
  const hasSelection = selectedProjects.length > 0;
  const latestComparisons = useLatestComparisons({ enabled: !hasSelection });

  const handleProjectsClick = useCallback(
    (projects: string[]) => {
      if (projects.length === 0) return;
      onAddMultipleProjects(projects);
    },
    [onAddMultipleProjects],
  );

  if (hasSelection) return null;

  if (latestComparisons.isLoading) {
    return <ComparisonsFeedSkeleton title={TITLE} projectCount={2} />;
  }

  const comparisons = latestComparisons.data?.comparisons;

  if (latestComparisons.error || !comparisons?.length) return null;

  return (
    <ComparisonsFeedSection title={TITLE}>
      {comparisons.map((comparison) => (
        <ComparisonCard
          key={comparison.id}
          projects={comparison.projects}
          onProjectsClick={handleProjectsClick}
          title=""
        />
      ))}
    </ComparisonsFeedSection>
  );
};

export default memo(LatestComparisons);
