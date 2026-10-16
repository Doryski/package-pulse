import * as z from "zod/mini";

export const ProjectsSearchFormSchema = z.object({
  search: z.string({
    error: (issue) =>
      issue.input === undefined ? "Please enter a project name." : undefined,
  }),
  projects: z.array(z.string()),
});

export type ProjectsSearchFormValues = z.infer<typeof ProjectsSearchFormSchema>;
