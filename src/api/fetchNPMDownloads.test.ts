/**
 * @vitest-environment node
 */
import fetchNPMDownloads from "@/api/fetchNPMDownloads";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

const fetchMock = vi.fn();
const SYSTEM_TIME = new Date("2024-03-15T10:30:00.000Z");

const jsonResponse = (body: unknown, status = 200) => ({
  status,
  ok: status < 400,
  json: async () => body,
});

const period = (downloads: { day: string; downloads: number }[]) => ({
  package: "react",
  start: "2024-01-01",
  end: "2024-03-15",
  downloads,
});

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(SYSTEM_TIME);
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("fetchNPMDownloads", () => {
  test("collects downloads from a valid start date window", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(period([{ day: "2024-03-01", downloads: 10 }])),
    );

    const result = await fetchNPMDownloads("react", new Date("2024-03-01"));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]![0]).toContain(
      "https://api.npmjs.org/downloads/range/2024-03-01:2024-03-15/react",
    );
    expect(result).toEqual([{ date: "2024-03-01", count: 10 }]);
  });

  test("falls back to the npm first day for a missing or invalid start date", async () => {
    fetchMock.mockImplementation(async () => jsonResponse(period([])));

    await fetchNPMDownloads("react");
    await fetchNPMDownloads("react", new Date("nope"));

    const urls = fetchMock.mock.calls.map((call) => call[0] as string);
    expect(urls.some((url) => url.includes("range/2015-01-10:"))).toBe(true);
    expect(fetchMock.mock.calls.length).toBeGreaterThan(2);
  });

  test("throws not found on a 404 window", async () => {
    fetchMock.mockResolvedValue(jsonResponse({}, 404));

    await expect(
      fetchNPMDownloads("ghost", new Date("2024-03-01")),
    ).rejects.toThrow('Package "ghost" not found');
  });

  test("throws on an invalid payload", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ nope: true }));

    await expect(
      fetchNPMDownloads("react", new Date("2024-03-01")),
    ).rejects.toThrow("Received invalid data from NPM API");
  });

  test("throws a generic error when the request rejects", async () => {
    fetchMock.mockRejectedValue(new Error("network down"));

    await expect(
      fetchNPMDownloads("react", new Date("2024-03-01")),
    ).rejects.toThrow("Unknown error while fetching NPM download data");
  });
});
