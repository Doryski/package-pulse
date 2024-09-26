import { differenceInCalendarDays, startOfYear, subDays } from "date-fns";

export const getPeriodStartByDays = (
  date: Date,
  periodLength: number,
): Date => {
  const firstSystemDay = startOfYear(1970);
  const daysSinceStart = differenceInCalendarDays(date, firstSystemDay);
  const daysToSubtract = daysSinceStart % periodLength;
  return subDays(date, daysToSubtract);
};
