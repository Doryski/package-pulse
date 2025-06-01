import getStatsMatrix from "@/app/(home)/utils/getStatsMatrix";
import { useTheme } from "next-themes";
import { useMemo } from "react";
import { ProjectStatsQuery } from "../queries/useProjectsStats";

export default function useStatsMatrix(projectsStats: ProjectStatsQuery[]) {
  const { resolvedTheme } = useTheme();
  const statsMatrix = useMemo(
    () => getStatsMatrix(projectsStats, resolvedTheme),
    [projectsStats, resolvedTheme],
  );
  return statsMatrix;
}
