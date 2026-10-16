import { describe, expect, test } from "vitest";
import { cn } from "./cn";

describe("cn", () => {
  test("joins class names and skips falsy values", () => {
    expect(cn("flex", false, undefined, null, "p-2")).toBe("flex p-2");
  });

  test("supports conditional object syntax", () => {
    expect(cn("flex", { "p-2": true, "m-2": false })).toBe("flex p-2");
  });

  test("merges conflicting tailwind classes with the last one winning", () => {
    expect(cn("p-2", "p-4")).toBe("p-4");
    expect(cn("text-red-500", "text-blue-500")).toBe("text-blue-500");
  });

  test("returns empty string without inputs", () => {
    expect(cn()).toBe("");
  });
});
