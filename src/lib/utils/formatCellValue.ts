export default function formatCellValue<T>(
  value: T,
  formatter: (value: NonNullable<T>) => string,
): string {
  return value ? formatter(value) : "-";
}
