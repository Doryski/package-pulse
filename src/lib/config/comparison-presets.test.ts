import { describe, expect, test } from "vitest";
import { QUICK_COMPARISONS } from "./comparison-presets";

describe("QUICK_COMPARISONS", () => {
  test("has unique titles", () => {
    const titles = QUICK_COMPARISONS.map((preset) => preset.title);
    expect(new Set(titles).size).toBe(titles.length);
  });

  test("each preset lists at least two unique packages", () => {
    for (const preset of QUICK_COMPARISONS) {
      expect(preset.projects.length).toBeGreaterThanOrEqual(2);
      expect(new Set(preset.projects).size).toBe(preset.projects.length);
    }
  });
});
