export default function trimTrailingZeroDays<T extends { count: number }>(
  series: T[],
) {
  const lastNonZeroIndex = series.findLastIndex((entry) => entry.count > 0);
  if (lastNonZeroIndex === -1) return series;
  return series.slice(0, lastNonZeroIndex + 1);
}
