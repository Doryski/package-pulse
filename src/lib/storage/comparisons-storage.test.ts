import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const RAW_IP = "203.0.113.7";
const LONG_USER_AGENT = "A".repeat(5000);

const loadStorage = async () => {
  vi.resetModules();
  return import("./comparisons-storage");
};

const makeComparison = (overrides = {}) => ({
  id: "1",
  timestamp: Date.now(),
  projects: ["react", "vue"],
  clientIP: RAW_IP,
  userAgent: LONG_USER_AGENT,
  ...overrides,
});

describe("comparisons-storage anonymization", () => {
  beforeEach(() => {
    delete process.env.PP_IP_HASH_SALT;
  });

  afterEach(() => {
    delete process.env.PP_IP_HASH_SALT;
  });

  it("hashes IPs to a stable 32-char hex string without the raw IP", async () => {
    const { hashClientIp } = await loadStorage();
    const hash = hashClientIp(RAW_IP);

    expect(hash).toMatch(/^[0-9a-f]{32}$/);
    expect(hash).not.toContain(RAW_IP);
    expect(hashClientIp(RAW_IP)).toBe(hash);
    expect(hashClientIp("203.0.113.8")).not.toBe(hash);
  });

  it("changes the hash when PP_IP_HASH_SALT is set", async () => {
    const { hashClientIp } = await loadStorage();
    const withoutSalt = hashClientIp(RAW_IP);
    process.env.PP_IP_HASH_SALT = "custom-salt";

    expect(hashClientIp(RAW_IP)).not.toBe(withoutSalt);
  });

  it("hashes a missing IP consistently", async () => {
    const { hashClientIp } = await loadStorage();

    expect(hashClientIp(undefined)).toBe(hashClientIp(""));
  });

  it("truncates long user agents and keeps undefined", async () => {
    const { truncateUserAgent } = await loadStorage();

    expect(truncateUserAgent(LONG_USER_AGENT)).toHaveLength(200);
    expect(truncateUserAgent("short")).toBe("short");
    expect(truncateUserAgent(undefined)).toBeUndefined();
  });

  it("anonymizeComparison replaces IP and truncates UA", async () => {
    const { anonymizeComparison, hashClientIp } = await loadStorage();
    const result = anonymizeComparison(makeComparison());

    expect(result.clientIP).toBe(hashClientIp(RAW_IP));
    expect(result.userAgent).toHaveLength(200);
    expect(result.projects).toEqual(["react", "vue"]);
  });

  it("persists only hashed data in the memory fallback and dedups by hash", async () => {
    const { comparisonsStorage, hashClientIp } = await loadStorage();
    await comparisonsStorage.addComparison(makeComparison());

    const stored = await comparisonsStorage.getComparisons();
    expect(stored).toHaveLength(1);
    expect(stored[0]?.clientIP).toBe(hashClientIp(RAW_IP));
    expect(stored[0]?.userAgent).toHaveLength(200);
    expect(JSON.stringify(stored)).not.toContain(RAW_IP);

    await expect(
      comparisonsStorage.addComparison(makeComparison({ id: "2" })),
    ).rejects.toThrow("DUPLICATE_COMPARISON");

    const byUser = await comparisonsStorage.getComparisonsByUser(RAW_IP);
    expect(byUser).toHaveLength(1);
  });
});

const REDIS_CONFIG = {
  PP_KV_REST_API_URL: "https://redis.example.com",
  PP_KV_REST_API_TOKEN: "token",
};

const redisMock = vi.hoisted(() => ({
  get: vi.fn(),
  eval: vi.fn(),
  constructor: vi.fn(),
}));

const loadWithEnv = async (
  nodeEnv: string,
  envOverrides: Record<string, string | undefined> = REDIS_CONFIG,
) => {
  vi.resetModules();
  vi.stubEnv("NODE_ENV", nodeEnv);
  vi.doMock("@/lib/config/env", () => ({ env: { ...envOverrides } }));
  vi.doMock("@upstash/redis", () => ({
    Redis: vi.fn().mockImplementation(function (config: unknown) {
      redisMock.constructor(config);
      return { get: redisMock.get, eval: redisMock.eval };
    }),
  }));
  return import("./comparisons-storage");
};

describe("comparisons-storage hashClientIp salt", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("uses the fallback salt when the salt variable is empty", async () => {
    const { hashClientIp } = await loadStorage();
    const unset = hashClientIp(RAW_IP);
    vi.stubEnv("PP_IP_HASH_SALT", "");

    expect(hashClientIp(RAW_IP)).toBe(unset);
  });

  it("produces different hashes for different salts", async () => {
    const { hashClientIp } = await loadStorage();
    vi.stubEnv("PP_IP_HASH_SALT", "salt-a");
    const a = hashClientIp(RAW_IP);
    vi.stubEnv("PP_IP_HASH_SALT", "salt-b");

    expect(hashClientIp(RAW_IP)).not.toBe(a);
  });

  it("anonymizeComparison keeps an undefined userAgent and hashes a missing IP", async () => {
    const { anonymizeComparison, hashClientIp } = await loadStorage();
    const result = anonymizeComparison(
      makeComparison({ clientIP: undefined, userAgent: undefined }),
    );

    expect(result.userAgent).toBeUndefined();
    expect(result.clientIP).toBe(hashClientIp(undefined));
  });
});

describe("comparisons-storage selection by NODE_ENV", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    vi.doUnmock("@/lib/config/env");
    vi.doUnmock("@upstash/redis");
  });

  it("uses memory storage outside production even when Redis is configured", async () => {
    const { comparisonsStorage } = await loadWithEnv("development");

    await comparisonsStorage.addComparison(makeComparison());

    expect(redisMock.constructor).not.toHaveBeenCalled();
    expect(redisMock.eval).not.toHaveBeenCalled();
    expect(await comparisonsStorage.getComparisons()).toHaveLength(1);
  });

  it("uses Redis storage in production when configured", async () => {
    redisMock.get.mockResolvedValue([]);
    const { comparisonsStorage } = await loadWithEnv("production");

    await comparisonsStorage.getComparisons();

    expect(redisMock.constructor).toHaveBeenCalledWith({
      url: REDIS_CONFIG.PP_KV_REST_API_URL,
      token: REDIS_CONFIG.PP_KV_REST_API_TOKEN,
    });
    expect(redisMock.get).toHaveBeenCalledWith("global_comparisons");
  });

  it.each([
    ["missing URL", { PP_KV_REST_API_TOKEN: "token" }],
    ["missing token", { PP_KV_REST_API_URL: "https://redis.example.com" }],
    ["missing both", {}],
  ])(
    "falls back to memory storage in production with %s",
    async (_, envOverrides) => {
      const { comparisonsStorage } = await loadWithEnv(
        "production",
        envOverrides,
      );

      expect(console.warn).toHaveBeenCalledWith(
        "Redis not available, falling back to memory storage:",
        expect.any(Error),
      );
      await comparisonsStorage.addComparison(makeComparison());
      expect(await comparisonsStorage.getComparisons()).toHaveLength(1);
      expect(redisMock.get).not.toHaveBeenCalled();
    },
  );

  it("falls back to memory storage when the Redis client constructor throws", async () => {
    vi.resetModules();
    vi.stubEnv("NODE_ENV", "production");
    vi.doMock("@/lib/config/env", () => ({ env: { ...REDIS_CONFIG } }));
    vi.doMock("@upstash/redis", () => ({
      Redis: vi.fn().mockImplementation(function () {
        throw new Error("bad config");
      }),
    }));
    const { comparisonsStorage } = await import("./comparisons-storage");

    expect(console.error).toHaveBeenCalledWith(
      "Failed to initialize Redis client:",
      expect.any(Error),
    );
    expect(await comparisonsStorage.getComparisons()).toEqual([]);
  });
});

describe("comparisons-storage Redis path", () => {
  const stored = (overrides = {}) => ({
    id: "1",
    timestamp: 1000,
    projects: ["react", "vue"],
    clientIP: "hash",
    ...overrides,
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    redisMock.get.mockReset();
    redisMock.eval.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.doUnmock("@/lib/config/env");
    vi.doUnmock("@upstash/redis");
  });

  it("getComparisons returns validated comparisons", async () => {
    redisMock.get.mockResolvedValue([stored()]);
    const { comparisonsStorage } = await loadWithEnv("production");

    expect(await comparisonsStorage.getComparisons()).toEqual([stored()]);
  });

  it.each([
    ["null", null],
    ["a non-array value", { not: "an array" }],
    ["a string", "garbage"],
  ])("getComparisons returns [] when Redis holds %s", async (_, value) => {
    redisMock.get.mockResolvedValue(value);
    const { comparisonsStorage } = await loadWithEnv("production");

    expect(await comparisonsStorage.getComparisons()).toEqual([]);
  });

  it("getComparisons returns [] and logs when Redis rejects", async () => {
    redisMock.get.mockRejectedValue(new Error("network"));
    const { comparisonsStorage } = await loadWithEnv("production");

    expect(await comparisonsStorage.getComparisons()).toEqual([]);
    expect(console.error).toHaveBeenCalledWith(
      "Failed to get comparisons from Redis:",
      expect.any(Error),
    );
  });

  it("getComparisonsByUser reads the hashed per-user key", async () => {
    redisMock.get.mockResolvedValue([stored()]);
    const { comparisonsStorage, hashClientIp } =
      await loadWithEnv("production");

    const result = await comparisonsStorage.getComparisonsByUser(RAW_IP);

    expect(result).toEqual([stored()]);
    expect(redisMock.get).toHaveBeenCalledWith(
      `comparisons_by_user:${hashClientIp(RAW_IP)}`,
    );
  });

  it.each([
    ["null", null],
    ["a non-array value", 42],
  ])("getComparisonsByUser returns [] for %s", async (_, value) => {
    redisMock.get.mockResolvedValue(value);
    const { comparisonsStorage } = await loadWithEnv("production");

    expect(await comparisonsStorage.getComparisonsByUser(RAW_IP)).toEqual([]);
  });

  it("getComparisonsByUser returns [] and logs when Redis rejects", async () => {
    redisMock.get.mockRejectedValue(new Error("network"));
    const { comparisonsStorage } = await loadWithEnv("production");

    expect(await comparisonsStorage.getComparisonsByUser(RAW_IP)).toEqual([]);
    expect(console.error).toHaveBeenCalledWith(
      "Failed to get user comparisons from Redis:",
      expect.any(Error),
    );
  });

  it("addComparison evals the script with an anonymized payload", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(1_700_000_000_000);
    redisMock.eval.mockResolvedValue("OK");
    const { comparisonsStorage, hashClientIp } =
      await loadWithEnv("production");

    await comparisonsStorage.addComparison(makeComparison());

    const [script, keys, args] = redisMock.eval.mock.calls[0]!;
    const hashed = hashClientIp(RAW_IP);
    expect(script).toContain("DUPLICATE");
    expect(keys).toEqual([
      "global_comparisons",
      `comparisons_by_user:${hashed}`,
    ]);
    expect(JSON.parse(args[0])).toMatchObject({
      clientIP: hashed,
      projects: ["react", "vue"],
    });
    expect(JSON.parse(args[0]).userAgent).toHaveLength(200);
    expect(args.slice(1)).toEqual([
      hashed,
      "1700000000000",
      String(5 * 60 * 1000),
      "20",
      "500",
      String(90 * 24 * 60 * 60),
    ]);
  });

  it("addComparison hashes a missing IP into the per-user key", async () => {
    redisMock.eval.mockResolvedValue("OK");
    const { comparisonsStorage, hashClientIp } =
      await loadWithEnv("production");

    await comparisonsStorage.addComparison(
      makeComparison({ clientIP: undefined }),
    );

    expect(redisMock.eval.mock.calls[0]![1][1]).toBe(
      `comparisons_by_user:${hashClientIp(undefined)}`,
    );
  });

  it("addComparison throws DUPLICATE_COMPARISON without logging an error", async () => {
    redisMock.eval.mockResolvedValue("DUPLICATE");
    const { comparisonsStorage } = await loadWithEnv("production");

    await expect(
      comparisonsStorage.addComparison(makeComparison()),
    ).rejects.toThrow("DUPLICATE_COMPARISON");
    expect(console.error).not.toHaveBeenCalled();
  });

  it("addComparison logs and rethrows unexpected Redis errors", async () => {
    redisMock.eval.mockRejectedValue(new Error("network"));
    const { comparisonsStorage } = await loadWithEnv("production");

    await expect(
      comparisonsStorage.addComparison(makeComparison()),
    ).rejects.toThrow("network");
    expect(console.error).toHaveBeenCalledWith(
      "Failed to add comparison to Redis:",
      expect.any(Error),
    );
  });

  it("addComparison rethrows a non-Error rejection", async () => {
    redisMock.eval.mockRejectedValue("string failure");
    const { comparisonsStorage } = await loadWithEnv("production");

    await expect(
      comparisonsStorage.addComparison(makeComparison()),
    ).rejects.toBe("string failure");
  });

  it("exposes the shared isDuplicateComparison helper", async () => {
    const { comparisonsStorage } = await loadWithEnv("production");
    const now = Date.now();

    expect(
      comparisonsStorage.isDuplicateComparison(
        makeComparison({ timestamp: now, projects: ["b", "a"] }),
        [makeComparison({ timestamp: now - 1000, projects: ["a", "b"] })],
      ),
    ).toBe(true);
  });
});

describe("comparisons-storage memory path", () => {
  const unique = (index: number) =>
    makeComparison({
      id: String(index),
      projects: [`pkg-${index}`],
      clientIP: `10.0.0.${index}`,
      timestamp: 1_000_000 + index,
    });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  it("returns empty results before anything is stored", async () => {
    const { comparisonsStorage } = await loadStorage();

    expect(await comparisonsStorage.getComparisons()).toEqual([]);
    expect(await comparisonsStorage.getComparisonsByUser(RAW_IP)).toEqual([]);
  });

  it("allows the same projects from the same IP after the dedup window", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000_000);
    const { comparisonsStorage } = await loadStorage();

    await comparisonsStorage.addComparison(
      makeComparison({ timestamp: Date.now() }),
    );
    vi.setSystemTime(1_000_000 + 5 * 60 * 1000 + 1);
    await comparisonsStorage.addComparison(
      makeComparison({ id: "2", timestamp: Date.now() }),
    );

    expect(await comparisonsStorage.getComparisons()).toHaveLength(2);
  });

  it("treats project order as irrelevant for duplicates", async () => {
    const { comparisonsStorage } = await loadStorage();
    await comparisonsStorage.addComparison(
      makeComparison({ projects: ["vue", "react"] }),
    );

    await expect(
      comparisonsStorage.addComparison(
        makeComparison({ id: "2", projects: ["react", "vue"] }),
      ),
    ).rejects.toThrow("DUPLICATE_COMPARISON");
  });

  it("allows different projects from one IP and the same projects from another IP", async () => {
    const { comparisonsStorage } = await loadStorage();
    await comparisonsStorage.addComparison(makeComparison());
    await comparisonsStorage.addComparison(
      makeComparison({ id: "2", projects: ["svelte"] }),
    );
    await comparisonsStorage.addComparison(
      makeComparison({ id: "3", clientIP: "198.51.100.9" }),
    );

    expect(await comparisonsStorage.getComparisons()).toHaveLength(3);
    expect(await comparisonsStorage.getComparisonsByUser(RAW_IP)).toHaveLength(
      2,
    );
  });

  it("caps comparisons per user at 20, keeping the newest", async () => {
    const { comparisonsStorage } = await loadStorage();
    for (let index = 0; index < 25; index += 1) {
      await comparisonsStorage.addComparison(
        makeComparison({
          id: String(index),
          projects: [`pkg-${index}`],
          timestamp: 2_000_000 + index,
        }),
      );
    }

    const all = await comparisonsStorage.getComparisons();
    expect(all).toHaveLength(20);
    expect(all[0]?.id).toBe("24");
    expect(all.at(-1)?.id).toBe("5");
    expect(await comparisonsStorage.getComparisonsByUser(RAW_IP)).toHaveLength(
      20,
    );
  });

  it("caps the global list at 500 entries", async () => {
    const { comparisonsStorage } = await loadStorage();
    for (let index = 0; index < 510; index += 1) {
      await comparisonsStorage.addComparison(unique(index));
    }

    const all = await comparisonsStorage.getComparisons();
    expect(all).toHaveLength(500);
    expect(all[0]?.id).toBe("509");
  });

  it("groups comparisons without an IP under the unknown user", async () => {
    const { comparisonsStorage } = await loadStorage();
    await comparisonsStorage.addComparison(
      makeComparison({ clientIP: undefined }),
    );

    expect(await comparisonsStorage.getComparisonsByUser("")).toHaveLength(1);
  });
});

describe("getUniqueComparisons", () => {
  const entry = (overrides = {}) => ({
    id: "x",
    timestamp: 1,
    projects: ["a"],
    clientIP: "u1",
    ...overrides,
  });

  it("returns the newest entry per user and per project combination", async () => {
    const { getUniqueComparisons } = await loadStorage();

    const result = getUniqueComparisons(
      [
        entry({ id: "old", timestamp: 1, clientIP: "u1", projects: ["a"] }),
        entry({ id: "new", timestamp: 5, clientIP: "u1", projects: ["b"] }),
        entry({ id: "same", timestamp: 4, clientIP: "u2", projects: ["b"] }),
        entry({ id: "other", timestamp: 3, clientIP: "u2", projects: ["c"] }),
        entry({
          id: "no-ip",
          timestamp: 2,
          clientIP: undefined,
          projects: ["e"],
        }),
        entry({
          id: "no-ip-2",
          timestamp: 1,
          clientIP: undefined,
          projects: ["f"],
        }),
      ],
      10,
    );

    expect(result.map((item) => item.id)).toEqual(["new", "other", "no-ip"]);
  });

  it("treats project order as irrelevant for uniqueness", async () => {
    const { getUniqueComparisons } = await loadStorage();

    const result = getUniqueComparisons(
      [
        entry({ id: "1", timestamp: 2, clientIP: "u1", projects: ["a", "b"] }),
        entry({ id: "2", timestamp: 1, clientIP: "u2", projects: ["b", "a"] }),
      ],
      10,
    );

    expect(result.map((item) => item.id)).toEqual(["1"]);
  });

  it("stops at the limit", async () => {
    const { getUniqueComparisons } = await loadStorage();

    const result = getUniqueComparisons(
      [1, 2, 3, 4].map((n) =>
        entry({
          id: String(n),
          timestamp: n,
          clientIP: `u${n}`,
          projects: [`p${n}`],
        }),
      ),
      2,
    );

    expect(result.map((item) => item.id)).toEqual(["4", "3"]);
  });

  it("returns [] for no input", async () => {
    const { getUniqueComparisons } = await loadStorage();

    expect(getUniqueComparisons([], 5)).toEqual([]);
  });
});
