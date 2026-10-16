import { describe, expect, test } from "vitest";
import isKeyOfObject from "./isKeyOfObject";

const sym = Symbol("s");
const object = { a: 1, 2: "two", [sym]: true };

describe("isKeyOfObject", () => {
  test("accepts own string, number and symbol keys", () => {
    expect(isKeyOfObject("a", object)).toBe(true);
    expect(isKeyOfObject(2, object)).toBe(true);
    expect(isKeyOfObject(sym, object)).toBe(true);
  });

  test("rejects missing keys", () => {
    expect(isKeyOfObject("missing", object)).toBe(false);
  });

  test("rejects inherited keys", () => {
    expect(isKeyOfObject("toString", object)).toBe(false);
  });

  test("rejects non-key value types", () => {
    expect(isKeyOfObject(null, object)).toBe(false);
    expect(isKeyOfObject(undefined, object)).toBe(false);
    expect(isKeyOfObject({}, object)).toBe(false);
    expect(isKeyOfObject(true, object)).toBe(false);
  });
});
