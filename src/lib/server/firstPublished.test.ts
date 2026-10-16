/**
 * @vitest-environment node
 */
import { beforeEach, describe, expect, test, vi } from "vitest";
import getFirstPublished from "./firstPublished";

const { getPackageInfoMock } = vi.hoisted(() => ({
  getPackageInfoMock: vi.fn(),
}));

vi.mock("@/lib/server/packageInfo", () => ({
  getPackageInfo: getPackageInfoMock,
}));

const liveSignal = () => new AbortController().signal;

beforeEach(() => {
  getPackageInfoMock.mockReset();
});

describe("getFirstPublished", () => {
  test.each([
    ["an ISO timestamp", "2026-05-02T21:59:09.103Z"],
    ["a bare date", "2026-05-02"],
  ])("keeps only the day of %s", async (_label, createdAt) => {
    getPackageInfoMock.mockResolvedValue({ createdAt });

    await expect(getFirstPublished(["react"], liveSignal())).resolves.toEqual({
      react: new Date(2026, 4, 2),
    });
  });

  test("resolves scoped package names", async () => {
    getPackageInfoMock.mockResolvedValue({ createdAt: "2019-01-15T10:00:00Z" });

    await expect(
      getFirstPublished(["@angular/core"], liveSignal()),
    ).resolves.toEqual({ "@angular/core": new Date(2019, 0, 15) });
    expect(getPackageInfoMock).toHaveBeenCalledWith("@angular/core");
  });

  test.each([
    ["null info", () => Promise.resolve(null)],
    ["null createdAt", () => Promise.resolve({ createdAt: null })],
    ["missing createdAt", () => Promise.resolve({})],
    ["garbage createdAt", () => Promise.resolve({ createdAt: "not-a-date" })],
    ["a rejected lookup", () => Promise.reject(new Error("registry down"))],
  ])("omits a package with %s", async (_label, lookup) => {
    getPackageInfoMock.mockImplementation((name: string) =>
      name === "bad" ? lookup() : Promise.resolve({ createdAt: "2020-02-03" }),
    );

    await expect(
      getFirstPublished(["bad", "good"], liveSignal()),
    ).resolves.toEqual({ good: new Date(2020, 1, 3) });
  });

  test("omits lookups still pending when the signal aborts and keeps resolved ones", async () => {
    const controller = new AbortController();
    getPackageInfoMock.mockImplementation((name: string) =>
      name === "slow"
        ? new Promise(() => undefined)
        : Promise.resolve({ createdAt: "2020-02-03" }),
    );

    const result = getFirstPublished(["slow", "fast"], controller.signal);
    await Promise.resolve();
    controller.abort();

    await expect(result).resolves.toEqual({ fast: new Date(2020, 1, 3) });
  });

  test("returns an empty map for an already aborted signal", async () => {
    getPackageInfoMock.mockImplementation(() => new Promise(() => undefined));

    await expect(
      getFirstPublished(["react", "vue"], AbortSignal.abort()),
    ).resolves.toEqual({});
  });
});
