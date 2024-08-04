import { addDays, getDay, subDays, subYears } from "date-fns";

export default function getLastYearsMostAdequateDay(
  currentDay: string | Date,
): Date {
  const oneYearAgo = subYears(currentDay, 1);
  const currentDayOfTheWeek = getDay(currentDay);
  const oneYearAgoDayOfTheWeek = getDay(oneYearAgo);
  if (currentDayOfTheWeek === oneYearAgoDayOfTheWeek) {
    return oneYearAgo;
  }
  const daysDifference = currentDayOfTheWeek - oneYearAgoDayOfTheWeek;
  if (daysDifference > 0) {
    return addDays(oneYearAgo, daysDifference);
  } else {
    return subDays(oneYearAgo, Math.abs(daysDifference));
  }
}
