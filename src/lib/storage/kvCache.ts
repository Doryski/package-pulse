import "server-only";
import { env } from "@/lib/config/env";
import { Redis } from "@upstash/redis";
import { z } from "zod";

export const MEMORY_CACHE_MAX_ENTRIES = 500;
const DURABLE_COOLDOWN_MS = 60 * 1000;

type MemoryEntry = { value: unknown; expiresAt: number };

const memoryCache = new Map<string, MemoryEntry>();

let redisClient: Redis | null = null;
let durableDisabledUntil = 0;

const isRedisConfigured = () =>
  Boolean(env.PP_KV_REST_API_URL && env.PP_KV_REST_API_TOKEN);

const isDurableAvailable = () =>
  isRedisConfigured() && Date.now() >= durableDisabledUntil;

function disableDurable(): void {
  durableDisabledUntil = Date.now() + DURABLE_COOLDOWN_MS;
}

function getRedisClient(): Redis {
  redisClient ??= new Redis({
    url: env.PP_KV_REST_API_URL,
    token: env.PP_KV_REST_API_TOKEN,
  });
  return redisClient;
}

const isExpired = (entry: MemoryEntry, now: number) => now >= entry.expiresAt;

const readMemory = (key: string) => {
  const entry = memoryCache.get(key);
  if (!entry || isExpired(entry, Date.now())) return null;
  return entry.value;
};

function evictMemory(now: number): void {
  for (const [key, entry] of memoryCache) {
    if (isExpired(entry, now)) memoryCache.delete(key);
  }
  const overflow = memoryCache.size - MEMORY_CACHE_MAX_ENTRIES;
  [...memoryCache.keys()]
    .slice(0, Math.max(0, overflow))
    .forEach((key) => memoryCache.delete(key));
}

function writeMemory(key: string, value: unknown, ttlSeconds: number): void {
  const now = Date.now();
  memoryCache.delete(key);
  memoryCache.set(key, { value, expiresAt: now + ttlSeconds * 1000 });
  if (memoryCache.size <= MEMORY_CACHE_MAX_ENTRIES) return;
  evictMemory(now);
}

async function readValue(key: string): Promise<unknown> {
  if (!isDurableAvailable()) return readMemory(key);
  try {
    return await getRedisClient().get(key);
  } catch (error) {
    console.error("Durable cache read failed, using memory cache:", error);
    disableDurable();
    return readMemory(key);
  }
}

export async function getCached<T extends z.ZodType>(
  key: string,
  schema: T,
): Promise<z.output<T> | null> {
  const value = await readValue(key);
  if (value === null || value === undefined) return null;
  const parsed = schema.safeParse(value);
  if (!parsed.success) return null;
  return parsed.data;
}

export async function setCached(
  key: string,
  value: unknown,
  ttlSeconds: number,
): Promise<void> {
  if (!isDurableAvailable()) {
    writeMemory(key, value, ttlSeconds);
    return;
  }
  try {
    await getRedisClient().set(key, value, { ex: ttlSeconds });
  } catch (error) {
    console.error("Durable cache write failed, using memory cache:", error);
    disableDurable();
    writeMemory(key, value, ttlSeconds);
  }
}
