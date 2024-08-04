export default function getPercentChange(
  current: number,
  previous: number,
): number {
  return (current / previous - 1) * 100;
}
