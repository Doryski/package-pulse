import { describe, expect, test } from "vitest";
import AppError, { isAppError, isClientError } from "./AppError";

describe("AppError", () => {
  test("sets name and message and extends Error", () => {
    const error = new AppError("boom");

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe("AppError");
    expect(error.message).toBe("boom");
    expect(error.status).toBeUndefined();
  });

  test("stores the optional status", () => {
    expect(new AppError("missing", { status: 404 }).status).toBe(404);
  });
});

describe("isAppError", () => {
  test("returns true for AppError instances", () => {
    expect(isAppError(new AppError("x"))).toBe(true);
  });

  test("returns false for other values", () => {
    expect(isAppError(new Error("x"))).toBe(false);
    expect(isAppError("x")).toBe(false);
    expect(isAppError(null)).toBe(false);
  });
});

describe("isClientError", () => {
  test("is true only for AppError with a status below 500", () => {
    expect(isClientError(new AppError("x", { status: 404 }))).toBe(true);
    expect(isClientError(new AppError("x", { status: 503 }))).toBe(false);
    expect(isClientError(new AppError("x"))).toBe(false);
    expect(isClientError(new Error("x"))).toBe(false);
  });
});
