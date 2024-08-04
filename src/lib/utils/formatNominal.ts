export default function formatInteger(value: number): string {
  return new Intl.NumberFormat("pl-PL", { useGrouping: true }).format(value);
}
