import { z } from "zod";

export const ProjectsSearchFormSchema = z.object({
  search: z.string({
    required_error: "Please enter a project name.",
  }),
  projects: z.array(z.string()).default([]),
});

export type ProjectsSearchFormValues = z.infer<typeof ProjectsSearchFormSchema>;
