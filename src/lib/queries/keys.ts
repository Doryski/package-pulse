import { formatDate } from "@/app/(home)/utils/date-utils";
import { toZonedTime } from "date-fns-tz";

export const getProjectStatsQueryKey = (projectName: string) => [
  "project-stats",
  projectName,
  formatDate(toZonedTime(new Date(), "UTC")),
];

export const getSearchNPMRegistryQueryKey = (search: string) => [
  "projects-suggestions",
  search,
];
