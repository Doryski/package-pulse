export default function formatInteger(value: number): string {
  const roundedValue = Math.round(value);
  return new Intl.NumberFormat("pl-PL", {
    useGrouping: true,
    maximumFractionDigits: 0,
  }).format(roundedValue);
}
