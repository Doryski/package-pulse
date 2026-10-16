import trimTrailingZeroDays from "@/lib/utils/trimTrailingZeroDays";

type DailyCount = { date: string; count: number };

const getLastNonZeroDate = (series: DailyCount[]) => {
  const last = trimTrailingZeroDays(series).at(-1);
  if (!last || last.count === 0) return undefined;
  return last.date;
};

const latestDate = (dates: string[]) =>
  dates.reduce((latest, date) => (date > latest ? date : latest));

export default function trimToDataHorizon<T extends DailyCount>(
  seriesByName: Record<string, T[] | null>,
  earliestHorizon: string,
) {
  const lastNonZeroDates = Object.values(seriesByName).flatMap((series) => {
    const date = series ? getLastNonZeroDate(series) : undefined;
    return date ? [date] : [];
  });
  const horizon = latestDate([earliestHorizon, ...lastNonZeroDates]);

  return Object.fromEntries(
    Object.entries(seriesByName).map(([name, series]) => [
      name,
      series ? series.filter((entry) => entry.date <= horizon) : series,
    ]),
  );
}
