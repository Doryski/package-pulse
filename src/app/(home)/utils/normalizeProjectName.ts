import { z } from "zod";

const NormalizedProjectNameSchema = z
  .string()
  .transform((projectName) => {
    return projectName.replace(/[\s\/@]/g, "_x_").toLowerCase();
  })
  .brand("NormalizedChartKey");

export type NormalizedProjectName = z.infer<typeof NormalizedProjectNameSchema>;

export const normalizeProjectName = (
  projectName: string,
): NormalizedProjectName => {
  return NormalizedProjectNameSchema.parse(projectName);
};

export default normalizeProjectName;
