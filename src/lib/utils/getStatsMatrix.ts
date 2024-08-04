import { DATE_FORMAT } from "@/api/fetchNPMDownloads";
import { format } from "date-fns";
import { SelectedProjectsStatsQueries } from "../types/selected-projects-stats-queries";
import getLastYearsMostAdequateDay from "./getLastYearsMostAdequateDay";
import getPercentChange from "./getPercentChange";
import { groupStats } from "./groupByPeriod";

type StatChange = {
  nominal: number;
  percentage: number;
};
type StatsRow = {
  projectName: string;
  weeklyChange: StatChange | null;
  monthlyChange: StatChange | null;
  yearlyChange: StatChange | null;
  oneYearAgoChange:
    | (StatChange & {
        currentFullDay: string;
        lastYearsMostAdequateDay: string;
      })
    | null;
};
export default function getStatsMatrix(stats: SelectedProjectsStatsQueries) {
  return stats.reduce<StatsRow[]>((acc, query) => {
    const projectName = query.data?.projectName;
    if (!projectName || !query.data) {
      return acc;
    }
    const groupedStats = groupStats(query.data?.rawSortedData);
    const currentFullWeek = groupedStats.byWeeks.slice(-2)[0];
    const previousFullWeek = groupedStats.byWeeks.slice(-3)[0];
    if (!currentFullWeek || !previousFullWeek) {
      return acc;
    }
    const weeklyChange =
      currentFullWeek && previousFullWeek
        ? {
            nominal: currentFullWeek.count - previousFullWeek.count,
            percentage: getPercentChange(
              currentFullWeek.count,
              previousFullWeek.count,
            ),
          }
        : null;

    const currentFullMonth = groupedStats.byMonths.slice(-2)[0];
    const previousFullMonth = groupedStats.byMonths.slice(-3)[0];
    const monthlyChange =
      currentFullMonth && previousFullMonth
        ? {
            nominal: currentFullMonth.count - previousFullMonth.count,
            percentage: getPercentChange(
              currentFullMonth.count,
              previousFullMonth.count,
            ),
          }
        : null;

    const currentFullYear = groupedStats.byYears.slice(-2)[0];
    const previousFullYear = groupedStats.byYears.slice(-3)[0];
    const yearlyChange =
      currentFullYear && previousFullYear
        ? {
            nominal: currentFullYear.count - previousFullYear.count,
            percentage: getPercentChange(
              currentFullYear.count,
              previousFullYear.count,
            ),
          }
        : null;

    const currentFullDay = groupedStats.byDays.slice(-2)[0];

    const lastYearsMostAdequateDay = currentFullDay?.date
      ? format(getLastYearsMostAdequateDay(currentFullDay?.date), DATE_FORMAT)
      : null;

    const lastYearsDay =
      currentFullDay && lastYearsMostAdequateDay
        ? groupedStats.byDays.find(
            (day) => day.date === lastYearsMostAdequateDay,
          )
        : null;
    const oneYearAgoChange =
      lastYearsDay && currentFullDay && lastYearsMostAdequateDay
        ? {
            nominal: currentFullDay.count - lastYearsDay.count,
            percentage: getPercentChange(
              currentFullDay.count,
              lastYearsDay.count,
            ),
            currentFullDay: format(currentFullDay.date, DATE_FORMAT),
            lastYearsMostAdequateDay,
          }
        : null;

    acc.push({
      projectName,
      weeklyChange,
      monthlyChange,
      yearlyChange,
      oneYearAgoChange,
    });
    return acc;
  }, []);
}
