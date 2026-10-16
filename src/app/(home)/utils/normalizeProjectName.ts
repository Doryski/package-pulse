import safeParse from "@/lib/utils/safeParse";
import * as z from "zod/mini";

const NormalizedProjectNameSchema = z
  .pipe(
    z.string(),
    z.transform((projectName: string) =>
      projectName.replace(/[\s\/@\.]/g, "_x_").toLowerCase(),
    ),
  )
  .brand("NormalizedChartKey");

export type NormalizedProjectName = z.infer<typeof NormalizedProjectNameSchema>;

const normalizeProjectName = (projectName: string): NormalizedProjectName => {
  return safeParse(projectName, NormalizedProjectNameSchema);
};

export default normalizeProjectName;
