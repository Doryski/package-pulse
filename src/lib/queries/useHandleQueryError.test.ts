import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import * as z from "zod/mini";

const mocks = vi.hoisted(() => ({ toastError: vi.fn() }));

vi.mock("sonner", () => ({ toast: { error: mocks.toastError } }));

import AppError from "../utils/AppError";
import useHandleQueryError from "./useHandleQueryError";

const getZodError = (value: unknown) => {
  const parsed = z.safeParse(z.object({ name: z.string() }), value, {
    reportInput: true,
  });
  if (parsed.success) throw new Error("expected a validation failure");
  return parsed.error;
};

describe("useHandleQueryError", () => {
  beforeEach(() => {
    mocks.toastError.mockReset();
  });

  test("returns the result without a toast on success", async () => {
    const { result } = renderHook(() => useHandleQueryError());

    await expect(result.current(async () => 5, "fallback")).resolves.toBe(5);
    expect(mocks.toastError).not.toHaveBeenCalled();
  });

  test("toasts the error message and rethrows", async () => {
    const { result } = renderHook(() => useHandleQueryError());
    const error = new AppError("rate limited");

    await expect(
      result.current(() => Promise.reject(error), "fallback"),
    ).rejects.toBe(error);
    expect(mocks.toastError).toHaveBeenCalledWith("rate limited");
  });

  test("toasts the fallback for a type error", async () => {
    const { result } = renderHook(() => useHandleQueryError());

    await expect(
      result.current(() => Promise.reject(new TypeError("x")), "fallback"),
    ).rejects.toBeInstanceOf(TypeError);
    expect(mocks.toastError).toHaveBeenCalledWith("fallback");
  });

  test("rejects silently for an undefined-input validation error", async () => {
    const { result } = renderHook(() => useHandleQueryError());
    const error = getZodError(undefined);

    await expect(
      result.current(() => Promise.reject(error), "fallback"),
    ).rejects.toThrow("Received undefined value.");
    expect(mocks.toastError).not.toHaveBeenCalled();
  });

  test("toasts when a validation error has no issues", async () => {
    const { result } = renderHook(() => useHandleQueryError());
    const error = new z.core.$ZodError([]);

    await expect(
      result.current(() => Promise.reject(error), "fallback"),
    ).rejects.toBe(error);
    expect(mocks.toastError).toHaveBeenCalledWith("fallback");
  });

  test("detects an explicitly undefined input on the issue", async () => {
    const { result } = renderHook(() => useHandleQueryError());
    const error = new z.core.$ZodError([
      {
        code: "invalid_type",
        expected: "string",
        path: ["name"],
        message: "Required",
        input: undefined,
      },
    ]);

    await expect(
      result.current(() => Promise.reject(error), "fallback"),
    ).rejects.toThrow("Received undefined value.");
  });

  test("toasts for other validation errors", async () => {
    const { result } = renderHook(() => useHandleQueryError());
    const error = getZodError({ name: 1 });

    await expect(
      result.current(() => Promise.reject(error), "fallback"),
    ).rejects.toBe(error);
    expect(mocks.toastError).toHaveBeenCalledWith("fallback");
  });

  test("detects undefined issues by message when input is absent", async () => {
    const { result } = renderHook(() => useHandleQueryError());
    const error = new z.core.$ZodError([
      {
        code: "invalid_type",
        expected: "string",
        path: ["name"],
        message: "Invalid input: expected string, received undefined",
      },
    ]);

    await expect(
      result.current(() => Promise.reject(error), "fallback"),
    ).rejects.toThrow("Received undefined value.");
  });
});
