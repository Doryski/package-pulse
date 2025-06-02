import { formatDate, parseDate } from "@/app/(home)/utils/date-utils";
import {
  NPM_API_FIRST_DAY,
  NPM_RANGE_API_PERIOD_MONTHS,
} from "@/lib/config/constants";
import {
  NPMDownloadCount,
  NPMDownloadPeriodSchema,
} from "@/lib/schemas/npmDownloadsPeriod.schema";
import AppError from "@/lib/utils/AppError";
import getTimePeriods from "@/lib/utils/getTimePeriods";
import safeParse from "@/lib/utils/safeParse";
import { isValid, startOfDay } from "date-fns";
import { toZonedTime } from "date-fns-tz";

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
        const { downloads } = safeParse(data, NPMDownloadPeriodSchema);
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
