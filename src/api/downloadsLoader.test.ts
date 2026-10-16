/**
 * @vitest-environment node
 */
import AppError from "@/lib/utils/AppError";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import loadDownloads, {
  buildDownloadsUrl,
  DOWNLOADS_ERROR_MESSAGE,
  fetchDownloadsBatch,
  notFoundMessage,
} from "./downloadsLoader";

const fetchMock = vi.fn<typeof fetch>();

const SERIES = { start: "2024-01-01", counts: [1, 2, 3] } as const;

const jsonResponse = (body: unknown, status = 200) =>
  Response.json(body, { status });

const requestedUrls = () =>
  fetchMock.mock.calls.map(([url]) => decodeURIComponent(String(url)));

const signal = () => new AbortController().signal;

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("buildDownloadsUrl", () => {
  test("requests the compact v2 shape with sorted packages", () => {
    expect(
      decodeURIComponent(buildDownloadsUrl(["vue", "@a/b", "react"])),
    ).toBe("/api/downloads?v=2&packages=@a/b,react,vue");
  });
});

describe("fetchDownloadsBatch", () => {
  test("passes the signal and reads each package series with its warning", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        data: { react: SERIES, vue: SERIES },
        errors: { vue: "Partial data" },
      }),
    );
    const abortSignal = signal();

    const read = await fetchDownloadsBatch(["vue", "react"], abortSignal);

    expect(fetchMock).toHaveBeenCalledWith(
      buildDownloadsUrl(["react", "vue"]),
      { signal: abortSignal },
    );
    expect(read("react")).toEqual({ series: SERIES, warning: undefined });
    expect(read("vue")).toEqual({ series: SERIES, warning: "Partial data" });
  });

  test.each([
    ["missing from the response", {}],
    ["null without an error", { ghost: null }],
  ])("maps a package %s to a 404 AppError", async (_, data) => {
    fetchMock.mockResolvedValue(jsonResponse({ data }));

    const read = await fetchDownloadsBatch(["ghost"], signal());

    expect(() => read("ghost")).toThrow(
      new AppError(notFoundMessage("ghost"), { status: 404 }),
    );
    expect(() => read("ghost")).toThrow(
      expect.objectContaining({ status: 404 }),
    );
  });

  test("keeps 404 status for the server's not-found message", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        data: { ghost: null },
        errors: { ghost: notFoundMessage("ghost") },
      }),
    );

    const read = await fetchDownloadsBatch(["ghost"], signal());

    expect(() => read("ghost")).toThrow(
      expect.objectContaining({
        message: notFoundMessage("ghost"),
        status: 404,
      }),
    );
  });

  test("maps a per-package upstream failure to a 502 AppError", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        data: { react: null },
        errors: { react: 'Failed to load downloads for "react"' },
      }),
    );

    const read = await fetchDownloadsBatch(["react"], signal());

    expect(() => read("react")).toThrow(
      expect.objectContaining({
        message: 'Failed to load downloads for "react"',
        status: 502,
      }),
    );
  });

  test.each([429, 500, 504])(
    "throws the server error with status %i on a non-ok response",
    async (status) => {
      fetchMock.mockResolvedValue(jsonResponse({ error: "Nope" }, status));

      await expect(fetchDownloadsBatch(["react"], signal())).rejects.toEqual(
        expect.objectContaining({ name: "AppError", message: "Nope", status }),
      );
    },
  );

  test("falls back to a generic message when the error body is unreadable", async () => {
    fetchMock.mockResolvedValue(new Response("oops", { status: 500 }));

    await expect(fetchDownloadsBatch(["react"], signal())).rejects.toEqual(
      expect.objectContaining({
        message: DOWNLOADS_ERROR_MESSAGE,
        status: 500,
      }),
    );
  });

  test("rejects a malformed success body", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ data: { react: [{ date: "2024-01-01", count: 1 }] } }),
    );

    await expect(fetchDownloadsBatch(["react"], signal())).rejects.toEqual(
      expect.objectContaining({
        message: DOWNLOADS_ERROR_MESSAGE,
        status: 502,
      }),
    );
  });
});

describe("loadDownloads", () => {
  test("batches same-tick loads into one sorted request", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ data: { react: SERIES, vue: SERIES } }),
    );

    const [vue, react] = await Promise.all([
      loadDownloads("vue"),
      loadDownloads("react"),
    ]);

    expect(requestedUrls()).toEqual(["/api/downloads?v=2&packages=react,vue"]);
    expect(vue.series).toEqual(SERIES);
    expect(react.series).toEqual(SERIES);
  });
});
