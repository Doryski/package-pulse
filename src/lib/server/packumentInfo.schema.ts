import { z } from "zod";

const RepositorySchema = z.union([
  z.string(),
  z.looseObject({ type: z.string().optional(), url: z.string() }),
]);

const LicenseSchema = z.union([
  z.string(),
  z.array(z.string()),
  z.looseObject({ type: z.string() }),
]);

const DependencyMapSchema = z.record(z.string(), z.string());

export const PackumentInfoSchema = z
  .looseObject({
    name: z.string(),
    description: z.string().optional(),
    homepage: z.string().optional(),
    license: LicenseSchema.optional(),
    repository: RepositorySchema.optional(),
    users: z.record(z.string(), z.unknown()).optional(),
    "dist-tags": z.record(z.string(), z.string()).optional(),
    versions: z.record(z.string(), z.unknown()).optional(),
    time: z.record(z.string(), z.string()).optional(),
  })
  .describe("NpmPackumentInfo");

export const VersionDependenciesSchema = z
  .looseObject({
    dependencies: DependencyMapSchema.optional(),
    devDependencies: DependencyMapSchema.optional(),
  })
  .describe("NpmVersionDependencies");

export type PackumentInfo = z.output<typeof PackumentInfoSchema>;
