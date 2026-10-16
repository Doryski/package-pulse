/**
 * @vitest-environment node
 */
import { describe, expect, test, vi } from "vitest";

const { fetchLatestManifestMock, cacheCalls } = vi.hoisted(() => ({
  fetchLatestManifestMock: vi.fn(),
  cacheCalls: [] as unknown[][],
}));

vi.mock("@/lib/server/npmRegistry", () => ({
  fetchLatestManifest: fetchLatestManifestMock,
}));

vi.mock("@/lib/config/serverCache", () => ({
  cacheDerived: (...args: unknown[]) => {
    cacheCalls.push(args);
    return args[0];
  },
}));

const { resolveLatestVersion, LATEST_VERSION_REVALIDATE_SECONDS } =
  await import("./latestVersion");

describe("resolveLatestVersion", () => {
  test("caches the lookup for an hour", () => {
    expect(cacheCalls).toEqual([
      [
        expect.any(Function),
        ["latest-version"],
        { revalidate: LATEST_VERSION_REVALIDATE_SECONDS },
      ],
    ]);
    expect(LATEST_VERSION_REVALIDATE_SECONDS).toBe(3600);
  });

  test("returns the latest manifest version", async () => {
    fetchLatestManifestMock.mockResolvedValue({
      name: "react",
      version: "19.0.0",
    });
    await expect(resolveLatestVersion("react")).resolves.toBe("19.0.0");
  });

  test("returns null for unknown packages", async () => {
    fetchLatestManifestMock.mockResolvedValue(null);
    await expect(resolveLatestVersion("missing-x")).resolves.toBeNull();
  });
});
