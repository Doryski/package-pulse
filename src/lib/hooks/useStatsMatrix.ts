import getStatsMatrix, {
  GetStatsMatrixResult,
} from "@/app/(home)/utils/getStatsMatrix";
import { ProjectStatsQuery } from "../queries/useProjectsStats";

const statsMatrixCache = new WeakMap<
  ProjectStatsQuery[],
  GetStatsMatrixResult
>();

const getMemoizedStatsMatrix = (projectsStats: ProjectStatsQuery[]) => {
  const cached = statsMatrixCache.get(projectsStats);
  if (cached) return cached;
  const statsMatrix = getStatsMatrix(projectsStats);
  statsMatrixCache.set(projectsStats, statsMatrix);
  return statsMatrix;
};

export default function useStatsMatrix(projectsStats: ProjectStatsQuery[]) {
  return getMemoizedStatsMatrix(projectsStats);
}
