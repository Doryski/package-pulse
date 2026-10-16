import { describe, expect, test } from "vitest";
import partitionPackages from "./partitionPackages";

describe("partitionPackages", () => {
  test("splits scoped and unscoped preserving order", () => {
    expect(
      partitionPackages(["react", "@types/node", "vue", "@babel/core"]),
    ).toEqual({
      unscoped: ["react", "vue"],
      scoped: ["@types/node", "@babel/core"],
    });
  });

  test("returns empty groups for empty input", () => {
    expect(partitionPackages([])).toEqual({ unscoped: [], scoped: [] });
  });

  test("handles only unscoped or only scoped", () => {
    expect(partitionPackages(["a"])).toEqual({ unscoped: ["a"], scoped: [] });
    expect(partitionPackages(["@a/b"])).toEqual({
      unscoped: [],
      scoped: ["@a/b"],
    });
  });
});
