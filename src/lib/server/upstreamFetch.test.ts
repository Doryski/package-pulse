/**
 * @vitest-environment node
 */
import { isAppError } from "@/lib/utils/AppError";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import {
  UPSTREAM_TIMEOUT_MS,
  upstreamFetch,
  upstreamStatusError,
} from "./upstreamFetch";

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  fetchMock.mockReset();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("upstreamFetch", () => {
  test("bypasses the fetch cache and applies the timeout", async () => {
    const timeoutSpy = vi.spyOn(AbortSignal, "timeout");
    fetchMock.mockResolvedValue(new Response("{}"));

    await upstreamFetch("label", "https://example.com", { method: "POST" });

    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe("https://example.com");
    expect(init).toMatchObject({ method: "POST", cache: "no-store" });
    expect(init?.signal).toBeInstanceOf(AbortSignal);
    expect(timeoutSpy).toHaveBeenCalledWith(UPSTREAM_TIMEOUT_MS);
  });

  test("maps timeouts to a 504 AppError", async () => {
    fetchMock.mockRejectedValue(
      Object.assign(new Error("timeout"), { name: "TimeoutError" }),
    );

    const error = await upstreamFetch("Bundle", "https://example.com").catch(
      (caught: unknown) => caught,
    );

    expect(isAppError(error)).toBe(true);
    expect(error).toMatchObject({ status: 504, message: "Bundle timed out" });
  });

  test("rethrows other errors unchanged", async () => {
    const failure = new TypeError("network");
    fetchMock.mockRejectedValue(failure);
    await expect(upstreamFetch("x", "https://example.com")).rejects.toBe(
      failure,
    );
  });
});

describe("upstreamStatusError", () => {
  test("is a 502 AppError naming the status", () => {
    expect(upstreamStatusError("Bundle", 500)).toMatchObject({
      status: 502,
      message: "Bundle failed: 500",
    });
  });
});
