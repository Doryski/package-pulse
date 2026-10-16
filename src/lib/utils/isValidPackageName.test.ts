import { describe, expect, it } from "vitest";
import isValidPackageName from "./isValidPackageName";

describe("isValidPackageName", () => {
  it.each([
    "react",
    "@tanstack/react-query",
    "date-fns",
    "JSONStream",
    "Base64",
  ])("accepts %s", (name) => {
    expect(isValidPackageName(name)).toBe(true);
  });

  it.each(["", ".hidden", "_private", "100%", "a b", "x".repeat(215)])(
    "rejects %s",
    (name) => {
      expect(isValidPackageName(name)).toBe(false);
    },
  );
});
