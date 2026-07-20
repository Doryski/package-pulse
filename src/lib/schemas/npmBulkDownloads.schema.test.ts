/**
 * @vitest-environment node
 */
import AppError from "@/lib/utils/AppError";
import { describe, expect, test } from "vitest";
import { z } from "zod";
import { normalizeRangeResponse } from "./npmBulkDownloads.schema";

const rawDownloads = [
  { day: "2024-01-01", downloads: 10 },
  { day: "2024-01-02", downloads: 20 },
];

const normalizedDownloads = [
  { date: "2024-01-01", count: 10 },
  { date: "2024-01-02", count: 20 },
];

describe("normalizeRangeResponse", () => {
  test("normalizes a flat single-package range shape into a keyed map", () => {
    const flat = {
      package: "react",
      start: "2024-01-01",
      end: "2024-01-02",
      downloads: rawDownloads,
    };

    expect(normalizeRangeResponse(flat)).toEqual({
      react: { downloads: normalizedDownloads },
    });
  });

  test("maps every package key for a bulk multi-package shape and keeps null entries null", () => {
    const bulk = {
      react: {
        package: "react",
        start: "2024-01-01",
        end: "2024-01-02",
        downloads: rawDownloads,
      },
      vue: null,
    };

    expect(normalizeRangeResponse(bulk)).toEqual({
      react: { downloads: normalizedDownloads },
      vue: null,
    });
  });

  test("returns an empty map for an empty bulk record", () => {
    expect(normalizeRangeResponse({})).toEqual({});
  });

  test("throws AppError on the 200 error-body shape", () => {
    expect(() => normalizeRangeResponse({ error: "rate limited" })).toThrow(
      AppError,
    );
    expect(() => normalizeRangeResponse({ error: "rate limited" })).toThrow(
      "rate limited",
    );
  });

  test("throws a ZodError for an unknown non-record shape", () => {
    expect(() => normalizeRangeResponse(42)).toThrow(z.ZodError);
  });

  test("throws a ZodError for a bulk record with a malformed period value", () => {
    expect(() => normalizeRangeResponse({ react: "not-a-period" })).toThrow(
      z.ZodError,
    );
  });
});
