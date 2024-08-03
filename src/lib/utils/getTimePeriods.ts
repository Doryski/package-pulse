import { isAfter, isBefore, sub } from "date-fns";

type Period = { start: Date; end: Date };

export default function getTimePeriods(
  from: Date,
  to: Date,
  unitsCount: number,
  unit: string,
): Period[] {
  let periods: Period[] = [];
  let endTime = to;

  while (isAfter(endTime, from)) {
    let startTime = sub(endTime, { [unit]: unitsCount });
    if (isBefore(startTime, from)) {
      startTime = from;
    }
    periods.push({ start: startTime, end: endTime });
    endTime = startTime;
  }
  return periods;
}
