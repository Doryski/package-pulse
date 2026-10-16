import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

const loadEnv = async () => {
  vi.resetModules();
  return (await import("./env")).env;
};

describe("env", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  test("accepts valid values", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("PP_KV_REST_API_URL", "https://kv.example.com");
    vi.stubEnv("PP_KV_REST_API_TOKEN", "token");
    vi.stubEnv("OPENAI_API_KEY", "key");
    vi.stubEnv("PP_E2E_TEST_PROXY", "1");
    const env = await loadEnv();
    expect(env).toEqual({
      NODE_ENV: "production",
      PP_KV_REST_API_URL: "https://kv.example.com",
      PP_KV_REST_API_TOKEN: "token",
      OPENAI_API_KEY: "key",
      PP_E2E_TEST_PROXY: "1",
    });
  });

  test("falls back for invalid values", async () => {
    vi.stubEnv("NODE_ENV", "staging");
    vi.stubEnv("PP_KV_REST_API_URL", "not-a-url");
    vi.stubEnv("PP_KV_REST_API_TOKEN", "");
    vi.stubEnv("OPENAI_API_KEY", "");
    vi.stubEnv("PP_E2E_TEST_PROXY", "yes");
    const env = await loadEnv();
    expect(env.NODE_ENV).toBe("development");
    expect(env.PP_KV_REST_API_URL).toBeUndefined();
    expect(env.PP_KV_REST_API_TOKEN).toBeUndefined();
    expect(env.OPENAI_API_KEY).toBeUndefined();
    expect(env.PP_E2E_TEST_PROXY).toBeUndefined();
  });
});
