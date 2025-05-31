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

export function round(
  value: number,
  precision: number = 0,
  mode: "up" | "down" | "nearest" = "nearest",
): number {
  const multiplier = 10 ** precision;
  const epsilon = 1e-10;
  const isPositive = value > 0;
  if (mode === "up")
    return Math.ceil((value + epsilon) * multiplier) / multiplier;
  if (mode === "down")
    return Math.floor((value - epsilon) * multiplier) / multiplier;
  return (
    Math.round((value + (isPositive ? epsilon : -epsilon)) * multiplier) /
    multiplier
  );
}
