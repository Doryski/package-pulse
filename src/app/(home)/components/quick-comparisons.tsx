"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils/cn";
import getChartColor from "@/lib/utils/getChartColor";
import { useTheme } from "next-themes";

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
  const { resolvedTheme } = useTheme();

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
          <Card
            key={category.title}
            className={cn(
              "cursor-pointer transition-all duration-200",
              "hover:bg-accent/50 hover:shadow-md",
              "border-2 hover:border-primary/20",
            )}
            onClick={() => handleCardClick(category.projects)}
          >
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {category.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex flex-wrap gap-2">
                {category.projects.map((project, index) => (
                  <div
                    key={project}
                    className="flex items-center gap-1.5 rounded-md bg-muted/50 px-2 py-1"
                  >
                    <div
                      className="size-2 rounded-full"
                      style={{
                        backgroundColor: getChartColor(resolvedTheme, index),
                      }}
                    />
                    <span className="text-xs font-medium">{project}</span>
                  </div>
                ))}
              </div>
              <div className="mt-3 text-xs text-muted-foreground">
                Press to compare all {category.projects.length} libraries
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
};

export default QuickComparisons;
