import { z } from "zod";

export const NPMPackageSearchItemSchema = z.object({
  package: z.object({
    name: z.string(),
    scope: z.string(),
    version: z.string(),
    description: z.string().optional(),
    keywords: z.array(z.string()).optional(),
    date: z.string(),
    links: z.object({
      npm: z.string(),
      homepage: z.string().optional(),
      repository: z.string().optional(),
      bugs: z.string().optional(),
    }),
    publisher: z.object({
      username: z.string(),
      email: z.string(),
    }),
    maintainers: z.array(
      z.object({
        username: z.string(),
        email: z.string(),
      })
    ),
  }),
  score: z.object({
    final: z.number(),
    detail: z.object({
      quality: z.number(),
      popularity: z.number(),
      maintenance: z.number(),
    }),
  }),
  searchScore: z.number(),
});

export const NPMPackageSearchSchema = z.object({
  objects: z.array(NPMPackageSearchItemSchema),
  total: z.number(),
  time: z.string(),
});

export type NPMPackageSearch = z.infer<typeof NPMPackageSearchSchema>;
