const DAY_MS = 86_400_000;

export default function getMsUntilNextUtcMidnight(timestamp: number) {
  return DAY_MS - (((timestamp % DAY_MS) + DAY_MS) % DAY_MS);
}
