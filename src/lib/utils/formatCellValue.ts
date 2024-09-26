export default function formatCellValue<T>(
  value: T,
  formatter: (value: NonNullable<T>) => string,
): string {
  if (value === null || value === undefined) {
    return "-";
  }
  return formatter(value);
}
