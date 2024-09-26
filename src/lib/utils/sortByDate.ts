import { differenceInCalendarDays } from "date-fns";

export default function sortByDate<T>(data: T[], predicate: (item: T) => Date) {
  return data.toSorted((a, b) =>
    differenceInCalendarDays(predicate(a), predicate(b)),
  );
}
