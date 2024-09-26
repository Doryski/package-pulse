import { addDays, getDay, subYears } from "date-fns";

export default function getLastYearsMostAdequateDay(
  currentDay: string | Date,
): Date {
  const oneYearAgo = subYears(currentDay, 1);
  const currentDayOfTheWeek = getDay(currentDay);
  const oneYearAgoDayOfTheWeek = getDay(oneYearAgo);

  if (currentDayOfTheWeek === oneYearAgoDayOfTheWeek) {
    return oneYearAgo;
  }

  const daysDifference = (currentDayOfTheWeek - oneYearAgoDayOfTheWeek + 7) % 7;
  return addDays(oneYearAgo, daysDifference);
}
