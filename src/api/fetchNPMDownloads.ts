import {
  NPMDownloadCount,
  NPMDownloadPeriodSchema,
} from "@/lib/schemas/npmDownloadsPeriod";
import AppError from "@/lib/utils/AppError";
import getTimePeriods from "@/lib/utils/getTimePeriods";
import { format, isValid, parseISO, startOfDay } from "date-fns";
import { toZonedTime } from "date-fns-tz";
export const NPM_API_FIRST_DAY = "2015-01-10";
export const NPM_RANGE_API_PERIOD_MONTHS = 18;
export const DATE_FORMAT = "yyyy-MM-dd";

const parseDate = (dateString: string) => parseISO(dateString);
const formatDate = (date: Date) => format(date, DATE_FORMAT);

export default async function fetchNPMDownloads(
  packageName: string,
  startDate?: Date,
) {
  let createdAtDate = parseDate(NPM_API_FIRST_DAY);
  if (startDate && isValid(startDate)) {
    createdAtDate = startDate;
  }

  const downloadsByDate: NPMDownloadCount[] = [];
  const today = startOfDay(toZonedTime(new Date(), "UTC"));

  const periods = getTimePeriods(
    createdAtDate,
    today,
    NPM_RANGE_API_PERIOD_MONTHS,
    "months",
  );

  const fetchPromises = periods.map((period) =>
    fetch(
      `https://api.npmjs.org/downloads/range/${formatDate(period.start)}:${formatDate(period.end)}/${packageName}`,
    ),
  );

  const results = await Promise.allSettled(fetchPromises);

  for (const result of results) {
    if (result.status === "fulfilled") {
      if (result.value.status === 404) {
        throw new AppError(`Package "${packageName}" not found`);
      }
      const data = await result.value.json();

      try {
        const { downloads } = NPMDownloadPeriodSchema.parse(data);
        downloadsByDate.push(...downloads);
      } catch (error) {
        throw new AppError("Received invalid data from NPM API");
      }
    } else {
      throw new AppError(`Unknown error while fetching NPM download data`);
    }
  }

  return downloadsByDate;
}
