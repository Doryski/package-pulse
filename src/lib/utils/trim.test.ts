import { describe, expect, test } from "vitest";
import trim from "./trim";

describe("trim", () => {
  test("collapses whitespace runs into a single space", () => {
    expect(trim`a    b`).toBe("a b");
  });

  test("collapses newlines and indentation", () => {
    expect(trim`
      one
      two
    `).toBe(" one two ");
  });

  test("removes backslash line continuations", () => {
    const strings = Object.assign(["a\\\nb"], {
      raw: ["a\\\nb"],
    }) as TemplateStringsArray;

    expect(trim(strings)).toBe("ab");
  });

  test("leaves single spaces untouched", () => {
    expect(trim`a b c`).toBe("a b c");
  });
});
