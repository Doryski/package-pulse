import { getItem } from "@/app/(home)/utils/typeArray";

export function max<T>(arr: T[], fn: (item: T) => number): T | undefined {
  const firstItem = getItem(arr, 0);
  if (!firstItem) return undefined;
  return arr.reduce(
    (maxValue, item) => (fn(item) > fn(maxValue) ? item : maxValue),
    firstItem,
  );
}

export function sum<T>(arr: T[], fn: (item: T) => number): number {
  return arr.reduce((acc, item) => acc + fn(item), 0);
}

export function average<T>(arr: T[], fn: (item: T) => number): number {
  return sum(arr, fn) / arr.length;
}

export function round(
  value: number,
  precision: number = 0,
  mode: "up" | "down" | "nearest" = "nearest",
): number {
  const multiplier = 10 ** precision;
  const epsilon = value === 0 ? 0 : 1e-10;
  const isPositive = value >= 0;
  const valueWithEpsilon = value + (isPositive ? epsilon : -epsilon);

  if (mode === "up")
    return Math.ceil(valueWithEpsilon * multiplier) / multiplier;
  if (mode === "down")
    return Math.floor(valueWithEpsilon * multiplier) / multiplier;
  return Math.round(valueWithEpsilon * multiplier) / multiplier;
}
