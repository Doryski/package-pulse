import { DATE_FORMAT } from "@/api/fetchNPMDownloads";
import { format } from "date-fns";
import { toZonedTime } from "date-fns-tz";

export const getProjectStatsQueryKey = (projectName: string) => [
  "project-stats",
  projectName,
  format(toZonedTime(new Date(), "UTC"), DATE_FORMAT),
];

export const getSearchNPMRegistryQueryKey = (search: string) => [
  "projects-suggestions",
  search,
];
