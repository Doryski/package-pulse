const DEFAULT_WINDOW_MS = 60 * 1000;
const DEFAULT_MAX_REQUESTS = 10;

type RateLimitOptions = {
  windowMs?: number;
  maxRequests?: number;
};

const SWEEP_THRESHOLD = 10_000;

const requestCounts = new Map<string, { count: number; resetTime: number }>();

function sweepExpired(now: number): void {
  if (requestCounts.size < SWEEP_THRESHOLD) return;
  for (const [key, data] of requestCounts) {
    if (now > data.resetTime) requestCounts.delete(key);
  }
}

export default function isRateLimited(
  clientKey: string,
  {
    windowMs = DEFAULT_WINDOW_MS,
    maxRequests = DEFAULT_MAX_REQUESTS,
  }: RateLimitOptions = {},
): boolean {
  const now = Date.now();
  const clientData = requestCounts.get(clientKey);

  if (!clientData || now > clientData.resetTime) {
    sweepExpired(now);
    requestCounts.set(clientKey, { count: 1, resetTime: now + windowMs });
    return false;
  }

  if (clientData.count >= maxRequests) {
    return true;
  }

  clientData.count++;
  return false;
}
