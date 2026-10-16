import { describe, expect, test } from "vitest";
import AppError from "./AppError";
import assertUnreachable from "./assertUnreachable";

describe("assertUnreachable", () => {
  test("throws AppError with the given message", () => {
    const run = () => assertUnreachable("unexpected" as never, "unreachable!");

    expect(run).toThrow(AppError);
    expect(run).toThrow("unreachable!");
  });
});
