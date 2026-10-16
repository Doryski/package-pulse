import { describe, expect, test } from "vitest";
import normalizeProjectName from "./normalizeProjectName";

describe("normalizeProjectName", () => {
  test.each([
    ["React", "react"],
    ["@scope/pkg.js", "_x_scope_x_pkg_x_js"],
    ["my project", "my_x_project"],
  ])("normalizes %s to %s", (input, expected) => {
    expect(normalizeProjectName(input)).toBe(expected);
  });
});
