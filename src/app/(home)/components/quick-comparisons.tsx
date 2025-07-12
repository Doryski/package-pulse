"use client";
import ComparisonCard from "./comparison-card";

type QuickComparisonsProps = {
  selectedProjects: string[];
  onAddMultipleProjects: (projectNames: string[]) => void;
};

const QUICK_COMPARISONS = [
  {
    title: "Frameworks",
    projects: ["react", "vue", "@angular/core", "svelte"],
  },
  {
    title: "Validation",
    projects: ["zod", "yup", "joi", "valibot", "arktype"],
  },
  {
    title: "State Management",
    projects: ["zustand", "jotai", "mobx", "redux"],
  },
  {
    title: "Testing",
    projects: [
      "@playwright/test",
      "cypress",
      "vitest",
      "@testing-library/react",
      "jest",
      "@storybook/react",
    ],
  },
  {
    title: "UI Components",
    projects: [
      "@mui/material",
      "@radix-ui/themes",
      "@mantine/core",
      "@chakra-ui/react",
      "@headlessui/react",
      "tailwindcss",
    ],
  },
  {
    title: "Date & Time",
    projects: ["date-fns", "dayjs", "luxon", "moment", "temporal-polyfill"],
  },
];

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
            projects={category.projects}
            onProjectsClick={() => handleCardClick(category.projects)}
            title={category.title}
          />
        ))}
      </div>
    </section>
  );
};

export default QuickComparisons;
