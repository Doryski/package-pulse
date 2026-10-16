import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.PW_PORT ?? 3210);
const BASE_URL = `http://localhost:${PORT}`;
const isCI = !!process.env.CI;
const FEED_SPEC = /comparisons-feed\.test\.ts/;

const desktop = {
  ...devices["Desktop Chrome"],
  viewport: { width: 1280, height: 720 },
} as const;

export default defineConfig({
  testDir: "./tests",
  timeout: 60_000,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: isCI ? 1 : undefined,
  reporter: isCI ? [["github"], ["html"]] : [["list"], ["html"]],
  fullyParallel: true,
  use: {
    headless: true,
    video: "retain-on-failure",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    baseURL: process.env.BASE_URL ?? BASE_URL,
  },
  projects: [
    {
      name: "storage",
      testMatch: FEED_SPEC,
      fullyParallel: false,
      use: desktop,
    },
    {
      name: "chromium",
      testIgnore: FEED_SPEC,
      use: desktop,
    },
    {
      name: "mobile",
      testIgnore: FEED_SPEC,
      grep: /@responsive/,
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
  webServer: {
    command: isCI
      ? `npx next start --port ${PORT}`
      : `npx next dev --port ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: !isCI,
    timeout: 120 * 1000,
    stdout: "pipe",
    stderr: "pipe",
    env: {
      PP_E2E_TEST_PROXY: "1",
      PP_KV_REST_API_URL: "",
      PP_KV_REST_API_TOKEN: "",
      OPENAI_API_KEY: "e2e-dummy",
    },
  },
});
