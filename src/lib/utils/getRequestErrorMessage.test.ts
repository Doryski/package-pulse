import { afterEach, describe, expect, test, vi } from "vitest";
import { z } from "zod";
import * as zm from "zod/mini";
import AppError from "./AppError";
import getRequestErrorMessage from "./getRequestErrorMessage";

const fallback = "Something went wrong";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("getRequestErrorMessage", () => {
  test("returns AppError message", () => {
    expect(getRequestErrorMessage(new AppError("custom"), fallback)).toBe(
      "custom",
    );
  });

  test("returns default for ZodError", () => {
    const result = z.string().safeParse(1);
    if (result.success) throw new Error("expected failure");

    expect(getRequestErrorMessage(result.error, fallback)).toBe(fallback);
  });

  test("returns default for a zod/mini error", () => {
    const result = zm.safeParse(zm.string(), 1);
    if (result.success) throw new Error("expected failure");

    expect(getRequestErrorMessage(result.error, fallback)).toBe(fallback);
  });

  test("returns default for TypeError", () => {
    expect(getRequestErrorMessage(new TypeError("bad"), fallback)).toBe(
      fallback,
    );
  });

  test("returns message for generic Error", () => {
    expect(getRequestErrorMessage(new Error("generic"), fallback)).toBe(
      "generic",
    );
  });

  test("returns default for non-error values", () => {
    expect(getRequestErrorMessage("str", fallback)).toBe(fallback);
    expect(getRequestErrorMessage(undefined, fallback)).toBe(fallback);
  });

  test("logs the error in development", () => {
    vi.stubEnv("NODE_ENV", "development");
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const error = new Error("dev");

    getRequestErrorMessage(error, fallback);

    expect(spy).toHaveBeenCalledWith(error);
  });

  test.each(["production", "test"])("does not log in %s", (env) => {
    vi.stubEnv("NODE_ENV", env);
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    getRequestErrorMessage(new Error("x"), fallback);

    expect(spy).not.toHaveBeenCalled();
  });
});
