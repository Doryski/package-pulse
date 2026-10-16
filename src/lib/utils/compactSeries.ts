import { NPMDownloadCount } from "@/lib/schemas/npmDownloadsPeriod.schema";

export type CompactSeries = { start: string; counts: (number | null)[] };

const DAY_MS = 86_400_000;
const ISO_DATE_LENGTH = 10;

const EMPTY_SERIES: CompactSeries = { start: "", counts: [] };

const toDayIndex = (date: string) =>
  Date.parse(`${date}T00:00:00.000Z`) / DAY_MS;

const fromDayIndex = (index: number) =>
  new Date(index * DAY_MS).toISOString().slice(0, ISO_DATE_LENGTH);

const minOf = (values: number[]) =>
  values.reduce((lowest, value) => Math.min(lowest, value));

const maxOf = (values: number[]) =>
  values.reduce((highest, value) => Math.max(highest, value));

export function toCompactSeries(series: NPMDownloadCount[]): CompactSeries {
  if (series.length === 0) return EMPTY_SERIES;

  const indices = series.map((entry) => toDayIndex(entry.date));
  const first = minOf(indices);
  const counts = Array.from<number | null>({
    length: maxOf(indices) - first + 1,
  }).fill(null);
  series.forEach((entry, position) => {
    counts[indices[position]! - first] = entry.count;
  });

  return { start: fromDayIndex(first), counts };
}

export function expandCompactSeries({
  start,
  counts,
}: CompactSeries): NPMDownloadCount[] {
  if (counts.length === 0) return [];
  const first = toDayIndex(start);
  return counts.flatMap((count, offset) =>
    count === null ? [] : [{ date: fromDayIndex(first + offset), count }],
  );
}
