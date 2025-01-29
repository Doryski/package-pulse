import { z } from "zod";

export const VersionSchema = z.object({
  name: z.string(),
  version: z.string(),
  description: z.string(),
  main: z.string(),
  scripts: z.record(z.string()).optional(),
  repository: z
    .object({
      type: z.string(),
      url: z.string(),
    })
    .optional(),
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
  homepage: z.string().optional(),
  devDependencies: z.record(z.string()).optional(),
  dependencies: z.record(z.string()).optional(),
  gitHead: z.string().optional(),
  _id: z.string(),
  _shasum: z.string().optional(),
  _from: z.string().optional(),
  _npmVersion: z.string().optional(),
  _npmUser: z.object({
    name: z.string(),
    email: z.string(),
  }),
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
    integrity: z.string(),
    signatures: z.array(
      z.object({
        keyid: z.string(),
        sig: z.string(),
      }),
    ),
  }),
  directories: z.record(z.string()),
});

export const NPMPackageInfoSchema = z.object({
  _id: z.string(),
  _rev: z.string(),
  name: z.string(),
  description: z.string(),
  "dist-tags": z.object({
    latest: z.string(),
    next: z.string().optional(),
  }),
  versions: z.record(VersionSchema),
  readme: z.string().optional(),
  maintainers: z.array(
    z.object({
      name: z.string(),
      email: z.string(),
    }),
  ),
  time: z.record(z.string()),
  homepage: z.string().optional(),
  repository: z.object({
    type: z.string(),
    url: z.string(),
  }),
  author: z
    .object({
      name: z.string(),
    })
    .optional(),
  license: z.string(),
  bugs: z.object({
    url: z.string(),
  }),
  readmeFilename: z.string(),
  users: z.record(z.boolean()).optional(),
});
