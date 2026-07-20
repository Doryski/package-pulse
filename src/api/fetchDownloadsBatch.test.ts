/**
 * @vitest-environment node
 */
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import fetchDownloadsBatch from "./fetchDownloadsBatch";

const fetchMock = vi.fn();

const jsonResponse = (body: unknown) => ({
  ok: true,
  json: async () => body,
});

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("fetchDownloadsBatch", () => {
  test("returns data and errors, dropping null data entries", async () => {
    const downloads = [{ date: "2024-01-01", count: 5 }];
    fetchMock.mockResolvedValue(
      jsonResponse({
        data: { react: downloads, lodash: null },
        errors: { vue: "not found" },
      }),
    );

    const result = await fetchDownloadsBatch(["react", "lodash", "vue"]);

    expect(result).toEqual({
      data: { react: downloads },
      errors: { vue: "not found" },
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  test("defaults errors to an empty object when omitted from the response", async () => {
    const downloads = [{ date: "2024-01-01", count: 5 }];
    fetchMock.mockResolvedValue(jsonResponse({ data: { react: downloads } }));

    const result = await fetchDownloadsBatch(["react"]);

    expect(result).toEqual({ data: { react: downloads }, errors: {} });
  });

  test("de-dupes concurrent calls with the same packages in different order", async () => {
    const downloads = [{ date: "2024-01-01", count: 9 }];
    fetchMock.mockResolvedValue(
      jsonResponse({ data: { react: downloads, vue: downloads } }),
    );

    const first = fetchDownloadsBatch(["react", "vue"]);
    const second = fetchDownloadsBatch(["vue", "react"]);

    const [firstResult, secondResult] = await Promise.all([first, second]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(firstResult).toBe(secondResult);
  });

  test("clears the in-flight cache after settling so a later identical call re-fetches", async () => {
    const downloads = [{ date: "2024-01-01", count: 1 }];
    fetchMock.mockResolvedValue(jsonResponse({ data: { react: downloads } }));

    await fetchDownloadsBatch(["react"]);
    await fetchDownloadsBatch(["react"]);

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  test("does not poison the cache on failure so a retry re-fetches", async () => {
    const downloads = [{ date: "2024-01-01", count: 3 }];
    fetchMock
      .mockRejectedValueOnce(new Error("network down"))
      .mockResolvedValueOnce(jsonResponse({ data: { react: downloads } }));

    await expect(fetchDownloadsBatch(["react"])).rejects.toThrow(
      "network down",
    );

    const retry = await fetchDownloadsBatch(["react"]);

    expect(retry).toEqual({ data: { react: downloads }, errors: {} });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
