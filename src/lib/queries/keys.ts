import { DATE_FORMAT } from "@/api/fetchNPMDownloads";
import { format } from "date-fns";

export const getProjectStatsQueryKey = (projectName: string) => [
  "project-stats",
  projectName,
  format(new Date(), DATE_FORMAT),
];

export const getSearchNPMRegistryQueryKey = (search: string) => [
  "projects-suggestions",
  search,
];
