import { z } from "zod";

export const DepsDevVersionSchema = z
  .object({
    licenses: z.array(z.string()).optional().catch(undefined),
    advisoryKeys: z
      .array(z.object({ id: z.string().optional().catch(undefined) }))
      .optional()
      .catch(undefined),
    relatedProjects: z
      .array(
        z.object({
          projectKey: z
            .object({ id: z.string().optional().catch(undefined) })
            .optional()
            .catch(undefined),
          relationType: z.string().optional().catch(undefined),
        }),
      )
      .optional()
      .catch(undefined),
  })
  .describe("DepsDevVersionSchema");

export const DepsDevProjectSchema = z
  .object({
    openIssuesCount: z.number().optional().catch(undefined),
    starsCount: z.number().optional().catch(undefined),
    forksCount: z.number().optional().catch(undefined),
    scorecard: z
      .object({
        overallScore: z.number().optional().catch(undefined),
      })
      .optional()
      .catch(undefined),
  })
  .describe("DepsDevProjectSchema");

export type DepsDevVersion = z.infer<typeof DepsDevVersionSchema>;
export type DepsDevProject = z.infer<typeof DepsDevProjectSchema>;
