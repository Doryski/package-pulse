/**
 * @vitest-environment node
 */
import { beforeEach, describe, expect, test, vi } from "vitest";

const { envState, limitMock, ratelimitConstructor } = vi.hoisted(() => ({
  envState: {} as Record<string, string | undefined>,
  limitMock: vi.fn(),
  ratelimitConstructor: vi.fn(),
}));

vi.mock("@/lib/config/env", () => ({ env: envState }));

vi.mock("@upstash/redis", () => ({
  Redis: vi.fn().mockImplementation(function () {
    return {};
  }),
}));

vi.mock("@upstash/ratelimit", () => {
  const Ratelimit = vi.fn().mockImplementation(function (config: unknown) {
    ratelimitConstructor(config);
    return { limit: limitMock };
  });
  return {
    Ratelimit: Object.assign(Ratelimit, {
      slidingWindow: (tokens: number, window: string) => ({ tokens, window }),
    }),
  };
});

const loadModule = () => import("./rateLimit");

const configureRedis = () => {
  envState.PP_KV_REST_API_URL = "https://redis.example.com";
  envState.PP_KV_REST_API_TOKEN = "token";
};

let keyCounter = 0;
const nextKey = () => `client-${(keyCounter += 1)}`;

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  delete envState.PP_KV_REST_API_URL;
  delete envState.PP_KV_REST_API_TOKEN;
});

describe("isRateLimited", () => {
  test("limits after maxRequests within the window", async () => {
    const { default: isRateLimited } = await loadModule();
    const key = nextKey();
    const options = { windowMs: 60_000, maxRequests: 2 };

    expect(isRateLimited(key, options)).toBe(false);
    expect(isRateLimited(key, options)).toBe(false);
    expect(isRateLimited(key, options)).toBe(true);
  });
});

describe("checkRateLimit", () => {
  test("uses the memory limiter when Redis is not configured", async () => {
    const { checkRateLimit } = await loadModule();
    const key = nextKey();
    const options = { windowMs: 60_000, maxRequests: 1 };

    expect(await checkRateLimit(key, options)).toBe(false);
    expect(await checkRateLimit(key, options)).toBe(true);
    expect(ratelimitConstructor).not.toHaveBeenCalled();
  });

  test("uses the durable sliding window limiter when Redis is configured", async () => {
    configureRedis();
    const { checkRateLimit } = await loadModule();
    limitMock.mockResolvedValueOnce({ success: true });
    limitMock.mockResolvedValueOnce({ success: false });

    expect(await checkRateLimit("ip", { windowMs: 1000, maxRequests: 3 })).toBe(
      false,
    );
    expect(await checkRateLimit("ip", { windowMs: 1000, maxRequests: 3 })).toBe(
      true,
    );
    expect(limitMock).toHaveBeenCalledWith("ip");
    expect(ratelimitConstructor).toHaveBeenCalledWith(
      expect.objectContaining({
        limiter: { tokens: 3, window: "1000 ms" },
      }),
    );
  });

  test("caches limiter instances per window and max requests", async () => {
    configureRedis();
    const { checkRateLimit } = await loadModule();
    limitMock.mockResolvedValue({ success: true });

    await checkRateLimit("a", { windowMs: 1000, maxRequests: 3 });
    await checkRateLimit("b", { windowMs: 1000, maxRequests: 3 });
    await checkRateLimit("a", { windowMs: 2000, maxRequests: 3 });

    expect(ratelimitConstructor).toHaveBeenCalledTimes(2);
  });

  test("falls back to the memory limiter when Upstash throws", async () => {
    configureRedis();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const { checkRateLimit } = await loadModule();
    limitMock.mockRejectedValue(new Error("network"));
    const key = nextKey();
    const options = { windowMs: 60_000, maxRequests: 1 };

    expect(await checkRateLimit(key, options)).toBe(false);
    expect(await checkRateLimit(key, options)).toBe(true);
  });

  test("falls back to the memory limiter when Upstash times out", async () => {
    configureRedis();
    const { checkRateLimit } = await loadModule();
    limitMock.mockResolvedValue({ success: true, reason: "timeout" });
    const key = nextKey();
    const options = { windowMs: 60_000, maxRequests: 1 };

    expect(await checkRateLimit(key, options)).toBe(false);
    expect(await checkRateLimit(key, options)).toBe(true);
  });

  test("skips Upstash for a cooldown after a failure, then retries it", async () => {
    configureRedis();
    vi.useFakeTimers();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const { checkRateLimit } = await loadModule();
    limitMock.mockRejectedValueOnce(new Error("network"));
    limitMock.mockResolvedValue({ success: true });

    await checkRateLimit(nextKey());
    await checkRateLimit(nextKey());
    expect(limitMock).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(60_001);
    await checkRateLimit(nextKey());
    expect(limitMock).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });
});

describe("memory limiter housekeeping", () => {
  test("sweeps expired entries once the map reaches the threshold", async () => {
    vi.useFakeTimers();
    const { default: isRateLimited } = await loadModule();
    const options = { windowMs: 1000, maxRequests: 1 };

    for (let index = 0; index < 10_000; index += 1) {
      isRateLimited(`sweep-${index}`, options);
    }
    vi.advanceTimersByTime(2000);

    expect(isRateLimited("sweep-new", options)).toBe(false);
    expect(isRateLimited("sweep-0", options)).toBe(false);
    expect(isRateLimited("sweep-0", options)).toBe(true);
    vi.useRealTimers();
  });

  test("keeps unexpired entries during a sweep", async () => {
    vi.useFakeTimers();
    const { default: isRateLimited } = await loadModule();
    const options = { windowMs: 60_000, maxRequests: 1 };

    for (let index = 0; index < 10_000; index += 1) {
      isRateLimited(`keep-${index}`, options);
    }

    expect(isRateLimited("keep-new", options)).toBe(false);
    expect(isRateLimited("keep-0", options)).toBe(true);
    vi.useRealTimers();
  });

  test("starts a fresh window after the previous one expires", async () => {
    vi.useFakeTimers();
    const { default: isRateLimited } = await loadModule();
    const options = { windowMs: 1000, maxRequests: 1 };

    expect(isRateLimited("w", options)).toBe(false);
    expect(isRateLimited("w", options)).toBe(true);
    vi.advanceTimersByTime(1001);
    expect(isRateLimited("w", options)).toBe(false);
    vi.useRealTimers();
  });
});

describe("checkRateLimit durable path details", () => {
  test("applies default window and max requests", async () => {
    configureRedis();
    const { checkRateLimit } = await loadModule();
    limitMock.mockResolvedValue({ success: true });

    await checkRateLimit("defaults");

    expect(ratelimitConstructor).toHaveBeenCalledWith(
      expect.objectContaining({
        limiter: { tokens: 10, window: "60000 ms" },
        prefix: "ratelimit:60000:10",
        timeout: 1000,
        analytics: false,
      }),
    );
  });

  test("does not use Upstash when only the URL or only the token is set", async () => {
    envState.PP_KV_REST_API_URL = "https://redis.example.com";
    const { checkRateLimit } = await loadModule();

    expect(await checkRateLimit(nextKey())).toBe(false);
    expect(ratelimitConstructor).not.toHaveBeenCalled();
  });

  test("logs the error and enters cooldown, using memory during it", async () => {
    configureRedis();
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { checkRateLimit } = await loadModule();
    limitMock.mockRejectedValueOnce(new Error("boom"));
    const key = nextKey();
    const options = { windowMs: 60_000, maxRequests: 1 };

    expect(await checkRateLimit(key, options)).toBe(false);
    expect(errorSpy).toHaveBeenCalledWith(
      "Durable rate limit failed, using memory limiter:",
      expect.any(Error),
    );
    expect(await checkRateLimit(key, options)).toBe(true);
    expect(limitMock).toHaveBeenCalledTimes(1);
  });

  test("a timeout starts the cooldown without logging", async () => {
    configureRedis();
    vi.useFakeTimers();
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { checkRateLimit } = await loadModule();
    limitMock.mockResolvedValueOnce({ success: true, reason: "timeout" });
    limitMock.mockResolvedValue({ success: false });

    await checkRateLimit(nextKey());
    expect(await checkRateLimit(nextKey())).toBe(false);
    expect(limitMock).toHaveBeenCalledTimes(1);
    expect(errorSpy).not.toHaveBeenCalled();

    vi.advanceTimersByTime(60_001);
    expect(await checkRateLimit(nextKey())).toBe(true);
    vi.useRealTimers();
  });
});
