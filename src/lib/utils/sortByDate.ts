import { differenceInCalendarDays } from "date-fns";

export default function sortByDate<T extends { date: string }>(data: T[]) {
  return data.toSorted((a, b) =>
    differenceInCalendarDays(new Date(a.date), new Date(b.date)),
  );
}
