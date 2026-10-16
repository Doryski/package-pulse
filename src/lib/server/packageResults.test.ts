import { describe, expect, test } from "vitest";
import {
  failed,
  found,
  hasUpstreamErrors,
  missing,
  toPackageResults,
} from "./packageResults";

describe("toPackageResults", () => {
  test("splits outcomes into data and errors", () => {
    expect(
      toPackageResults([
        found("a", 1),
        found("b", null),
        missing("c"),
        failed("d"),
      ]),
    ).toEqual({
      data: { a: 1, b: null, c: null, d: null },
      errors: { c: "notFound", d: "upstream" },
    });
  });
});

describe("hasUpstreamErrors", () => {
  test("ignores notFound errors", () => {
    expect(hasUpstreamErrors({ a: "notFound" })).toBe(false);
    expect(hasUpstreamErrors({ a: "notFound", b: "upstream" })).toBe(true);
  });
});
