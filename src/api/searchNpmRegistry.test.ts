/**
 * @vitest-environment node
 */
import searchNPMRegistry, {
  SEARCH_NPM_REGISTRY_ERROR_MESSAGE,
} from "@/api/searchNpmRegistry";
import AppError from "@/lib/utils/AppError";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

const fetchMock = vi.fn();

const item = {
  package: {
    name: "react",
    version: "19.0.0",
    date: "2024-01-01",
    links: { npm: "https://npmjs.com/package/react" },
    maintainers: [{ username: "a", email: "a@b.c" }],
  },
  score: { final: 1, detail: { quality: 1, popularity: 1, maintenance: 1 } },
  searchScore: 1,
};

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("searchNPMRegistry", () => {
  test("returns an empty list for an empty search without fetching", async () => {
    expect(await searchNPMRegistry("")).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test("returns the parsed objects and encodes the query", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ objects: [item], total: 1, time: "now" }),
    });

    const result = await searchNPMRegistry("react dom");

    expect(fetchMock.mock.calls[0]![0]).toBe(
      "https://registry.npmjs.org/-/v1/search?text=react%20dom&size=20&popularity=1.0",
    );
    expect(result).toEqual([item]);
  });

  test("passes the abort signal to fetch", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ objects: [], total: 0, time: "now" }),
    });
    const controller = new AbortController();

    await searchNPMRegistry("react", controller.signal);

    expect(fetchMock.mock.calls[0]![1]).toEqual({ signal: controller.signal });
  });

  test("rethrows a failed request instead of returning no results", async () => {
    fetchMock.mockRejectedValue(new Error("offline"));

    await expect(searchNPMRegistry("react")).rejects.toThrow("offline");
  });

  test("throws an AppError with the status when the response is not ok", async () => {
    const json = vi.fn();
    fetchMock.mockResolvedValue({ ok: false, status: 503, json });

    const error = await searchNPMRegistry("react").catch((e: unknown) => e);

    expect(error).toBeInstanceOf(AppError);
    expect(error).toMatchObject({
      message: SEARCH_NPM_REGISTRY_ERROR_MESSAGE,
      status: 503,
    });
    expect(json).not.toHaveBeenCalled();
  });
});
