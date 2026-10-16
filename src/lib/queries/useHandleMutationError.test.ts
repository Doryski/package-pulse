import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({ toastError: vi.fn() }));

vi.mock("sonner", () => ({ toast: { error: mocks.toastError } }));

import AppError from "../utils/AppError";
import useHandleMutationError from "./useHandleMutationError";

describe("useHandleMutationError", () => {
  beforeEach(() => {
    mocks.toastError.mockReset();
  });

  test("returns the result without a toast on success", async () => {
    const { result } = renderHook(() => useHandleMutationError());

    await expect(result.current(async () => "ok", "fallback")).resolves.toBe(
      "ok",
    );
    expect(mocks.toastError).not.toHaveBeenCalled();
  });

  test("toasts the AppError message and rethrows", async () => {
    const { result } = renderHook(() => useHandleMutationError());
    const error = new AppError("bad request");

    await expect(
      result.current(() => Promise.reject(error), "fallback"),
    ).rejects.toBe(error);
    expect(mocks.toastError).toHaveBeenCalledWith("bad request");
  });

  test("toasts the fallback for non-error rejections", async () => {
    const { result } = renderHook(() => useHandleMutationError());

    await expect(
      result.current(() => Promise.reject("nope"), "fallback"),
    ).rejects.toBe("nope");
    expect(mocks.toastError).toHaveBeenCalledWith("fallback");
  });
});
