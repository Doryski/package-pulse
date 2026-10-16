import { env } from "@/lib/config/env";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const DEFAULT_WINDOW_MS = 60 * 1000;
const DEFAULT_MAX_REQUESTS = 10;
const DURABLE_PREFIX = "ratelimit";
const DURABLE_TIMEOUT_MS = 1000;
const DURABLE_COOLDOWN_MS = 60 * 1000;

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

let redisClient: Redis | null = null;
let durableDisabledUntil = 0;

const isDurableAvailable = () =>
  isRedisConfigured() && Date.now() >= durableDisabledUntil;

function disableDurable(): void {
  durableDisabledUntil = Date.now() + DURABLE_COOLDOWN_MS;
}
const ratelimiters = new Map<string, Ratelimit>();

const isRedisConfigured = () =>
  Boolean(env.PP_KV_REST_API_URL && env.PP_KV_REST_API_TOKEN);

function getRedisClient(): Redis {
  redisClient ??= new Redis({
    url: env.PP_KV_REST_API_URL,
    token: env.PP_KV_REST_API_TOKEN,
  });
  return redisClient;
}

function getRatelimiter(windowMs: number, maxRequests: number): Ratelimit {
  const cacheKey = `${windowMs}:${maxRequests}`;
  const cached = ratelimiters.get(cacheKey);
  if (cached) return cached;

  const ratelimiter = new Ratelimit({
    redis: getRedisClient(),
    limiter: Ratelimit.slidingWindow(maxRequests, `${windowMs} ms`),
    prefix: `${DURABLE_PREFIX}:${cacheKey}`,
    timeout: DURABLE_TIMEOUT_MS,
    analytics: false,
  });
  ratelimiters.set(cacheKey, ratelimiter);
  return ratelimiter;
}

export async function checkRateLimit(
  clientKey: string,
  {
    windowMs = DEFAULT_WINDOW_MS,
    maxRequests = DEFAULT_MAX_REQUESTS,
  }: RateLimitOptions = {},
): Promise<boolean> {
  const options = { windowMs, maxRequests };
  if (!isDurableAvailable()) return isRateLimited(clientKey, options);

  try {
    const { success, reason } = await getRatelimiter(
      windowMs,
      maxRequests,
    ).limit(clientKey);
    if (reason !== "timeout") return !success;
    disableDurable();
    return isRateLimited(clientKey, options);
  } catch (error) {
    console.error("Durable rate limit failed, using memory limiter:", error);
    disableDurable();
    return isRateLimited(clientKey, options);
  }
}
