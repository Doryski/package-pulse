import * as z from "zod/mini";

export const NPMPackageSearchItemSchema = z.object({
  package: z.object({
    name: z.string(),
    scope: z.optional(z.string()),
    version: z.string(),
    description: z.optional(z.string()),
    keywords: z.optional(z.array(z.string())),
    date: z.string(),
    links: z.object({
      npm: z.string(),
      homepage: z.optional(z.string()),
      repository: z.optional(z.string()),
      bugs: z.optional(z.string()),
    }),
    publisher: z.optional(
      z.object({
        username: z.string(),
        email: z.string(),
      }),
    ),
    maintainers: z.array(
      z.object({
        username: z.string(),
        email: z.string(),
      }),
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
