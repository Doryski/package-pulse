import { add, DurationUnit, isAfter, isBefore, min } from "date-fns";

export type Period = { start: Date; end: Date };

export default function getTimePeriods(
  from: Date,
  to: Date,
  unitsCount: number,
  unit: DurationUnit,
  anchor: Date = from,
): Period[] {
  const periods: Period[] = [];
  if (unitsCount <= 0) return periods;

  const boundary = (index: number) =>
    add(anchor, { [unit]: index * unitsCount });

  for (let index = 0; isBefore(boundary(index), to); index++) {
    const end = boundary(index + 1);
    if (!isAfter(end, from)) continue;
    periods.push({ start: boundary(index), end: min([end, to]) });
  }
  return periods;
}
