import { env } from "@/lib/config/env";
import {
  GlobalComparison,
  GlobalComparisonSchema,
} from "@/lib/types/global-comparison";
import safeParse from "@/lib/utils/safeParse";
import { Redis } from "@upstash/redis";
import { createHash } from "node:crypto";
import { z } from "zod";

const GlobalComparisonsSchema = z.array(GlobalComparisonSchema);

const COMPARISONS_KEY = "global_comparisons";
const COMPARISONS_BY_USER_KEY = "comparisons_by_user";
const MAX_COMPARISONS = 500;
const MAX_COMPARISONS_PER_USER = 20;
const DEDUP_WINDOW_MS = 5 * 60 * 1000;
const USER_KEY_TTL_SECONDS = 90 * 24 * 60 * 60;
const UNKNOWN_CLIENT = "unknown";
const IP_HASH_LENGTH = 32;
const IP_HASH_FALLBACK_SALT = "package-pulse-ip-hash-v1";
const MAX_USER_AGENT_LENGTH = 200;

export function hashClientIp(clientIP: string | undefined): string {
  const salt = process.env.PP_IP_HASH_SALT || IP_HASH_FALLBACK_SALT;
  return createHash("sha256")
    .update(`${salt}:${clientIP || UNKNOWN_CLIENT}`)
    .digest("hex")
    .slice(0, IP_HASH_LENGTH);
}

export function truncateUserAgent(
  userAgent: string | undefined,
): string | undefined {
  return userAgent?.slice(0, MAX_USER_AGENT_LENGTH);
}

export function anonymizeComparison(
  comparison: GlobalComparison,
): GlobalComparison {
  return {
    ...comparison,
    clientIP: hashClientIp(comparison.clientIP),
    userAgent: truncateUserAgent(comparison.userAgent),
  };
}

const ADD_COMPARISON_SCRIPT = `
local raw = redis.call('GET', KEYS[1])
local comparisons = {}
if raw then
  local ok, decoded = pcall(cjson.decode, raw)
  if ok and type(decoded) == 'table' then
    comparisons = decoded
  end
end

local newComparison = cjson.decode(ARGV[1])
local clientIP = ARGV[2]
local now = tonumber(ARGV[3])
local dedupWindow = tonumber(ARGV[4])
local maxPerUser = tonumber(ARGV[5])
local maxTotal = tonumber(ARGV[6])
local userTtl = tonumber(ARGV[7])

local function projectsKey(projects)
  local copy = {}
  for i, p in ipairs(projects) do copy[i] = p end
  table.sort(copy)
  return table.concat(copy, '|')
end

local newKey = projectsKey(newComparison.projects)

for _, c in ipairs(comparisons) do
  if c.clientIP == clientIP and type(c.timestamp) == 'number' and (now - c.timestamp) < dedupWindow then
    if projectsKey(c.projects) == newKey then
      return 'DUPLICATE'
    end
  end
end

local updated = { newComparison }
for _, c in ipairs(comparisons) do
  updated[#updated + 1] = c
end

local byUser = {}
local order = {}
for _, c in ipairs(updated) do
  local ip = c.clientIP or 'unknown'
  if not byUser[ip] then
    byUser[ip] = {}
    order[#order + 1] = ip
  end
  table.insert(byUser[ip], c)
end

local limited = {}
for _, ip in ipairs(order) do
  local list = byUser[ip]
  table.sort(list, function(a, b) return a.timestamp > b.timestamp end)
  for i = 1, math.min(#list, maxPerUser) do
    limited[#limited + 1] = list[i]
  end
end

table.sort(limited, function(a, b) return a.timestamp > b.timestamp end)

local final = {}
for i = 1, math.min(#limited, maxTotal) do
  final[#final + 1] = limited[i]
end

redis.call('SET', KEYS[1], cjson.encode(final))

local userComparisons = {}
for _, c in ipairs(final) do
  if (c.clientIP or 'unknown') == clientIP then
    userComparisons[#userComparisons + 1] = c
  end
end
redis.call('SET', KEYS[2], cjson.encode(userComparisons), 'EX', userTtl)

return 'OK'
` as const;

let memoryComparisons: GlobalComparison[] = [];
const memoryComparisonsByUser: Record<string, GlobalComparison[]> = {};

type ComparisonStorage = {
  getComparisons: () => Promise<GlobalComparison[]>;
  addComparison: (comparison: GlobalComparison) => Promise<void>;
  getComparisonsByUser: (clientIP: string) => Promise<GlobalComparison[]>;
  isDuplicateComparison: (
    comparison: GlobalComparison,
    existingComparisons: GlobalComparison[],
  ) => boolean;
};

function isDuplicateComparison(
  newComparison: GlobalComparison,
  existingComparisons: GlobalComparison[],
): boolean {
  const recentComparisonsByIP = existingComparisons.filter(
    (comparison) =>
      comparison.clientIP === newComparison.clientIP &&
      Date.now() - comparison.timestamp < DEDUP_WINDOW_MS,
  );

  return recentComparisonsByIP.some(
    (comparison) =>
      JSON.stringify(comparison.projects.sort()) ===
      JSON.stringify(newComparison.projects.sort()),
  );
}

function getUniqueComparisons(
  comparisons: GlobalComparison[],
  limit: number,
): GlobalComparison[] {
  const uniqueComparisons: GlobalComparison[] = [];
  const seenProjectCombinations = new Set<string>();
  const seenUsers = new Set<string>();

  const sortedComparisons = comparisons.sort(
    (a, b) => b.timestamp - a.timestamp,
  );

  for (const comparison of sortedComparisons) {
    const projectsKey = comparison.projects.slice().sort().join("|");
    const userKey = comparison.clientIP || "unknown";

    if (!seenProjectCombinations.has(projectsKey) && !seenUsers.has(userKey)) {
      seenProjectCombinations.add(projectsKey);
      seenUsers.add(userKey);
      uniqueComparisons.push(comparison);

      if (uniqueComparisons.length >= limit) {
        break;
      }
    }
  }

  return uniqueComparisons;
}

let redis: Redis | null = null;

function getRedisClient(): Redis {
  if (!redis) {
    try {
      if (!env.PP_KV_REST_API_URL || !env.PP_KV_REST_API_TOKEN) {
        throw new Error("Missing Redis URL or token");
      }
      redis = new Redis({
        url: env.PP_KV_REST_API_URL,
        token: env.PP_KV_REST_API_TOKEN,
      });
    } catch (error) {
      console.error("Failed to initialize Redis client:", error);
      throw new Error("Redis not properly configured");
    }
  }
  return redis!;
}

const redisStorage: ComparisonStorage = {
  async getComparisons() {
    try {
      const client = getRedisClient();
      const raw = await client.get<GlobalComparison[]>(COMPARISONS_KEY);
      const comparisons = safeParse(raw, GlobalComparisonsSchema);
      return Array.isArray(comparisons) ? comparisons : [];
    } catch (error) {
      console.error("Failed to get comparisons from Redis:", error);

      return [];
    }
  },

  async addComparison(rawComparison: GlobalComparison) {
    try {
      const client = getRedisClient();
      const newComparison = anonymizeComparison(rawComparison);
      const clientIP = newComparison.clientIP ?? UNKNOWN_CLIENT;

      const result = await client.eval<string[], string>(
        ADD_COMPARISON_SCRIPT,
        [COMPARISONS_KEY, `${COMPARISONS_BY_USER_KEY}:${clientIP}`],
        [
          JSON.stringify(newComparison),
          clientIP,
          String(Date.now()),
          String(DEDUP_WINDOW_MS),
          String(MAX_COMPARISONS_PER_USER),
          String(MAX_COMPARISONS),
          String(USER_KEY_TTL_SECONDS),
        ],
      );

      if (result === "DUPLICATE") {
        throw new Error("DUPLICATE_COMPARISON");
      }
    } catch (error) {
      if (error instanceof Error && error.message === "DUPLICATE_COMPARISON") {
        throw error;
      }

      console.error("Failed to add comparison to Redis:", error);

      throw error;
    }
  },

  async getComparisonsByUser(rawClientIP: string) {
    try {
      const client = getRedisClient();
      const raw = await client.get<GlobalComparison[]>(
        `${COMPARISONS_BY_USER_KEY}:${hashClientIp(rawClientIP)}`,
      );
      const comparisons = safeParse(raw, GlobalComparisonsSchema);
      return Array.isArray(comparisons) ? comparisons : [];
    } catch (error) {
      console.error("Failed to get user comparisons from Redis:", error);
      return [];
    }
  },

  isDuplicateComparison,
};

const memoryStorage: ComparisonStorage = {
  async getComparisons() {
    return memoryComparisons;
  },

  async addComparison(rawComparison: GlobalComparison) {
    const newComparison = anonymizeComparison(rawComparison);
    if (isDuplicateComparison(newComparison, memoryComparisons)) {
      throw new Error("DUPLICATE_COMPARISON");
    }

    const updatedComparisons = [newComparison, ...memoryComparisons];

    const comparisonsByUser = new Map<string, GlobalComparison[]>();
    for (const comparison of updatedComparisons) {
      const ip = comparison.clientIP || "unknown";
      if (!comparisonsByUser.has(ip)) {
        comparisonsByUser.set(ip, []);
      }
      comparisonsByUser.get(ip)!.push(comparison);
    }

    const limitedComparisons: GlobalComparison[] = [];
    for (const [, userComparisons] of comparisonsByUser.entries()) {
      const sortedUserComparisons = userComparisons
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, MAX_COMPARISONS_PER_USER);
      limitedComparisons.push(...sortedUserComparisons);
    }

    memoryComparisons = limitedComparisons
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, MAX_COMPARISONS);

    const userComparisons = memoryComparisons.filter(
      (c) => c.clientIP === newComparison.clientIP,
    );
    const clientIP = newComparison.clientIP ?? UNKNOWN_CLIENT;
    memoryComparisonsByUser[clientIP] = userComparisons;
  },

  async getComparisonsByUser(rawClientIP: string) {
    return memoryComparisonsByUser[hashClientIp(rawClientIP)] || [];
  },

  isDuplicateComparison,
};

function getComparisonsStorage(): ComparisonStorage {
  if (process.env.NODE_ENV === "production") {
    try {
      getRedisClient();
      return redisStorage;
    } catch (error) {
      console.warn(
        "Redis not available, falling back to memory storage:",
        error,
      );
      return memoryStorage;
    }
  }
  return memoryStorage;
}

export const comparisonsStorage: ComparisonStorage = getComparisonsStorage();

export { getUniqueComparisons };
