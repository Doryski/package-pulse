"use client";
import { QUICK_COMPARISONS } from "@/lib/config/comparison-presets";
import { projectsToComparePath } from "@/lib/utils/slug";
import { memo, PropsWithChildren } from "react";
import ComparisonCard from "./comparison-card";

type QuickComparisonsProps = {
  selectedProjects: string[];
  onAddMultipleProjects: (projectNames: string[]) => void;
};

const QUICK_COMPARISON_ITEMS = QUICK_COMPARISONS.map((category) => {
  const projects = [...category.projects];
  return {
    title: category.title,
    projects,
    href: projectsToComparePath(projects),
  };
});

const QuickComparisonsGrid = ({ children }: PropsWithChildren) => (
  <section className="mt-6">
    <h2 className="mb-4 text-lg font-semibold">Quick Comparisons</h2>
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{children}</div>
  </section>
);

export const QuickComparisonLinks = () => (
  <QuickComparisonsGrid>
    {QUICK_COMPARISON_ITEMS.map(({ title, projects, href }) => (
      <ComparisonCard
        key={title}
        projects={projects}
        href={href}
        title={title}
      />
    ))}
  </QuickComparisonsGrid>
);

const QuickComparisons = ({
  selectedProjects,
  onAddMultipleProjects,
}: QuickComparisonsProps) => {
  if (selectedProjects.length > 0) {
    return null;
  }

  return (
    <QuickComparisonsGrid>
      {QUICK_COMPARISON_ITEMS.map(({ title, projects }) => (
        <ComparisonCard
          key={title}
          projects={projects}
          onProjectsClick={onAddMultipleProjects}
          title={title}
        />
      ))}
    </QuickComparisonsGrid>
  );
};

export default memo(QuickComparisons);
