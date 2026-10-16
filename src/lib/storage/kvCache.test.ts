/**
 * @vitest-environment node
 */
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { z } from "zod";

const { redisGetMock, redisSetMock } = vi.hoisted(() => ({
  redisGetMock: vi.fn(),
  redisSetMock: vi.fn(),
}));

vi.mock("@upstash/redis", () => ({
  Redis: class {
    get = redisGetMock;
    set = redisSetMock;
  },
}));

const ListSchema = z.array(z.string());

const loadKvCache = async () => {
  vi.resetModules();
  return import("./kvCache");
};

const useMemory = () => {
  vi.stubEnv("PP_KV_REST_API_URL", "");
  vi.stubEnv("PP_KV_REST_API_TOKEN", "");
};

const useRedis = () => {
  vi.stubEnv("PP_KV_REST_API_URL", "https://kv.example.com");
  vi.stubEnv("PP_KV_REST_API_TOKEN", "token");
};

beforeEach(() => {
  vi.useFakeTimers();
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  redisGetMock.mockReset();
  redisSetMock.mockReset();
});

describe("kvCache with memory storage", () => {
  test("returns null for an unknown key", async () => {
    useMemory();
    const { getCached } = await loadKvCache();
    await expect(getCached("missing", ListSchema)).resolves.toBeNull();
  });

  test("returns a stored value until its ttl expires", async () => {
    useMemory();
    const { getCached, setCached } = await loadKvCache();

    await setCached("similar:a,b", ["c"], 10);
    await expect(getCached("similar:a,b", ListSchema)).resolves.toEqual(["c"]);

    vi.advanceTimersByTime(10_000);
    await expect(getCached("similar:a,b", ListSchema)).resolves.toBeNull();
  });

  test("returns null when the stored value fails the schema", async () => {
    useMemory();
    const { getCached, setCached } = await loadKvCache();

    await setCached("key", { not: "a list" }, 10);

    await expect(getCached("key", ListSchema)).resolves.toBeNull();
  });

  test("evicts the oldest entries beyond the bound", async () => {
    useMemory();
    const { getCached, setCached, MEMORY_CACHE_MAX_ENTRIES } =
      await loadKvCache();

    for (let index = 0; index <= MEMORY_CACHE_MAX_ENTRIES; index++) {
      await setCached(`key-${index}`, [String(index)], 60);
    }

    await expect(getCached("key-0", ListSchema)).resolves.toBeNull();
    await expect(
      getCached(`key-${MEMORY_CACHE_MAX_ENTRIES}`, ListSchema),
    ).resolves.toEqual([String(MEMORY_CACHE_MAX_ENTRIES)]);
  });

  test("drops expired entries before evicting live ones", async () => {
    useMemory();
    const { getCached, setCached, MEMORY_CACHE_MAX_ENTRIES } =
      await loadKvCache();

    await setCached("short", ["s"], 1);
    await setCached("keep", ["k"], 600);
    vi.advanceTimersByTime(2000);
    for (let index = 0; index < MEMORY_CACHE_MAX_ENTRIES - 1; index++) {
      await setCached(`key-${index}`, [String(index)], 600);
    }

    await expect(getCached("keep", ListSchema)).resolves.toEqual(["k"]);
  });
});

describe("kvCache with Upstash", () => {
  test("reads and writes through Redis with a ttl", async () => {
    useRedis();
    redisGetMock.mockResolvedValue(["x"]);
    const { getCached, setCached } = await loadKvCache();

    await setCached("key", ["x"], 30);
    await expect(getCached("key", ListSchema)).resolves.toEqual(["x"]);

    expect(redisSetMock).toHaveBeenCalledWith("key", ["x"], { ex: 30 });
    expect(redisGetMock).toHaveBeenCalledWith("key");
  });

  test("returns null when Redis has no value", async () => {
    useRedis();
    redisGetMock.mockResolvedValue(null);
    const { getCached } = await loadKvCache();
    await expect(getCached("key", ListSchema)).resolves.toBeNull();
  });

  test("falls back to memory after a write failure", async () => {
    useRedis();
    redisSetMock.mockRejectedValue(new Error("down"));
    const { getCached, setCached } = await loadKvCache();

    await setCached("key", ["memory"], 30);
    await expect(getCached("key", ListSchema)).resolves.toEqual(["memory"]);

    expect(redisGetMock).not.toHaveBeenCalled();
  });

  test("falls back to memory after a read failure and retries after cooldown", async () => {
    useRedis();
    redisGetMock.mockRejectedValueOnce(new Error("down"));
    const { getCached } = await loadKvCache();

    await expect(getCached("key", ListSchema)).resolves.toBeNull();
    await expect(getCached("key", ListSchema)).resolves.toBeNull();
    expect(redisGetMock).toHaveBeenCalledTimes(1);

    redisGetMock.mockResolvedValue(["back"]);
    vi.advanceTimersByTime(60_000);
    await expect(getCached("key", ListSchema)).resolves.toEqual(["back"]);
  });
});
