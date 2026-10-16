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
