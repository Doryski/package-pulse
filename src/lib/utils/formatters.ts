import { round } from "./math";

export function formatPercentage(value: number, precision = 2): string {
  return round(value, precision) + "%";
}

export function formatLargeNumber(value: unknown): string {
  let numericValue: number;
  if (typeof value !== "number") {
    numericValue = Number(value);
  } else {
    numericValue = value;
  }

  if (numericValue > 1_000_000_000) {
    return `${round(numericValue / 1_000_000_000, 1)}B`;
  }

  if (numericValue >= 1_000_000) {
    return `${round(numericValue / 1_000_000, 1)}M`;
  }
  if (numericValue >= 1_000) {
    return `${round(numericValue / 1_000, 1)}K`;
  }
  return numericValue.toLocaleString();
}

export function formatInteger(
  value: number,
  thousandSeparator?: string,
): string {
  const roundedValue = round(value, 0);
  const formattedValue = new Intl.NumberFormat("pl-PL", {
    useGrouping: true,
    maximumFractionDigits: 0,
  }).format(roundedValue);

  if (thousandSeparator) {
    if (thousandSeparator === ".") {
      throw new Error("Thousand separator cannot be a dot");
    }
    return formattedValue.replace(/\s/g, thousandSeparator);
  }
  return formattedValue;
}

export function formatCellValue<T>(
  value: T,
  formatter: (value: NonNullable<T>) => string,
): string {
  if (value === null || value === undefined) {
    return "-";
  }
  return formatter(value);
}
