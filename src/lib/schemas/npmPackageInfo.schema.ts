import { z } from "zod";

const RepositorySchema = z.union([
  z.object({
    type: z.string().optional(),
    url: z.string(),
  }),
  z.string(),
]);

export const VersionSchema = z.object({
  name: z.string(),
  version: z.string(),
  keywords: z.array(z.string()).optional(),
  description: z.string().optional(),
  main: z.string().optional(),
  scripts: z.record(z.string()).optional(),
  repository: RepositorySchema.optional(),
  author: z
    .union([
      z.object({
        name: z.string(),
      }),
      z.string(),
    ])
    .optional(),
  license: z
    .union([
      z.string(),
      z.object({
        type: z.string(),
        url: z.string(),
      }),
    ])
    .optional(),
  bugs: z
    .union([
      z.object({
        url: z.string(),
      }),
      z.string(),
    ])
    .optional(),
  homepage: z.string().optional(),
  devDependencies: z.record(z.string()).optional(),
  dependencies: z.record(z.string()).optional(),
  gitHead: z.string().optional(),
  _id: z.string(),
  _shasum: z.string().optional(),
  _from: z.string().optional(),
  _npmVersion: z.string().optional(),
  _npmUser: z
    .object({
      name: z.string(),
      email: z.string(),
    })
    .optional(),
  maintainers: z
    .array(
      z.object({
        name: z.string(),
        email: z.string(),
      }),
    )
    .optional(),
  dist: z.object({
    shasum: z.string(),
    tarball: z.string(),
    integrity: z.string().optional(),
    signatures: z
      .array(
        z.object({
          keyid: z.string(),
          sig: z.string(),
        }),
      )
      .optional(),
  }),
  directories: z.record(z.string()),
});

export const NPMPackageInfoSchema = z.object({
  _id: z.string().optional(),
  _rev: z.string().optional(),
  name: z.string().optional(),
  keywords: z.array(z.string()).optional(),
  description: z.string().optional(),
  "dist-tags": z
    .object({
      latest: z.string(),
      next: z.string().optional(),
    })
    .optional(),
  versions: z.record(VersionSchema).optional(),
  readme: z.string().optional(),
  maintainers: z
    .array(
      z.object({
        name: z.string(),
        email: z.string(),
      }),
    )
    .optional(),
  time: z.record(z.string()).optional(),
  homepage: z.string().optional(),
  repository: RepositorySchema.optional(),
  author: z
    .object({
      name: z.string(),
    })
    .optional(),
  license: z.string().optional(),
  bugs: z
    .object({
      url: z.string(),
    })
    .optional(),
  readmeFilename: z.string().optional(),
  users: z.record(z.boolean()).optional(),
});
