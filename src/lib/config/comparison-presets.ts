export const QUICK_COMPARISONS = [
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
] as const;

export type ComparisonPreset = (typeof QUICK_COMPARISONS)[number];
