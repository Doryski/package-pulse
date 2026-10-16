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
