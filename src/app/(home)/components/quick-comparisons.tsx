"use client";
import { QUICK_COMPARISONS } from "@/lib/config/comparison-presets";
import ComparisonCard from "./comparison-card";

type QuickComparisonsProps = {
  selectedProjects: string[];
  onAddMultipleProjects: (projectNames: string[]) => void;
};

const QuickComparisons = ({
  selectedProjects,
  onAddMultipleProjects,
}: QuickComparisonsProps) => {
  if (selectedProjects.length > 0) {
    return null;
  }

  const handleCardClick = (projects: string[]) => {
    onAddMultipleProjects(projects);
  };

  return (
    <section className="mt-6">
      <h2 className="mb-4 text-lg font-semibold">Quick Comparisons</h2>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {QUICK_COMPARISONS.map((category) => (
          <ComparisonCard
            key={category.title}
            projects={[...category.projects]}
            onProjectsClick={() => handleCardClick([...category.projects])}
            title={category.title}
          />
        ))}
      </div>
    </section>
  );
};

export default QuickComparisons;
