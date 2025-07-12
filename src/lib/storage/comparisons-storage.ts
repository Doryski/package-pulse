import { GlobalComparison } from "@/lib/types/global-comparison";
import { Redis } from "@upstash/redis";

const COMPARISONS_KEY = "global_comparisons";
const COMPARISONS_BY_USER_KEY = "comparisons_by_user";
const MAX_COMPARISONS = 500;
const MAX_COMPARISONS_PER_USER = 20;

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
      Date.now() - comparison.timestamp < 5 * 60 * 1000, // 5 minutes
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
      redis = new Redis({
        url: process.env.PP_KV_REST_API_URL!,
        token: process.env.PP_KV_REST_API_TOKEN!,
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
      const comparisons = await client.get<GlobalComparison[]>(COMPARISONS_KEY);
      return comparisons || [];
    } catch (error) {
      console.error("Failed to get comparisons from Redis:", error);

      return [];
    }
  },

  async addComparison(newComparison: GlobalComparison) {
    try {
      const existingComparisons = await this.getComparisons();

      if (isDuplicateComparison(newComparison, existingComparisons)) {
        throw new Error("DUPLICATE_COMPARISON");
      }

      const updatedComparisons = [newComparison, ...existingComparisons];

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

      const finalComparisons = limitedComparisons
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, MAX_COMPARISONS);

      const client = getRedisClient();
      await client.set(COMPARISONS_KEY, finalComparisons);

      const userComparisons = finalComparisons.filter(
        (c) => c.clientIP === newComparison.clientIP,
      );
      await client.set(
        `${COMPARISONS_BY_USER_KEY}:${newComparison.clientIP}`,
        userComparisons,
      );
    } catch (error) {
      console.error("Failed to add comparison to Redis:", error);

      throw error;
    }
  },

  async getComparisonsByUser(clientIP: string) {
    try {
      const client = getRedisClient();
      const comparisons = await client.get<GlobalComparison[]>(
        `${COMPARISONS_BY_USER_KEY}:${clientIP}`,
      );
      return comparisons || [];
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

  async addComparison(newComparison: GlobalComparison) {
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
    const clientIP = newComparison.clientIP || "unknown";
    memoryComparisonsByUser[clientIP] = userComparisons;
  },

  async getComparisonsByUser(clientIP: string) {
    return memoryComparisonsByUser[clientIP] || [];
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
