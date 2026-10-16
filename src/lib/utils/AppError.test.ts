import { describe, expect, test } from "vitest";
import AppError, { isAppError } from "./AppError";

describe("AppError", () => {
  test("sets name and message and extends Error", () => {
    const error = new AppError("boom");

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe("AppError");
    expect(error.message).toBe("boom");
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
