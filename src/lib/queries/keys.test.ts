import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import {
  getProjectStatsQueryKey,
  getSearchNPMRegistryQueryKey,
  normalizeSearchTerm,
} from "./keys";

describe("query keys", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-03-05T23:30:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test("project stats key holds only the name so it survives UTC midnight", () => {
    const beforeMidnight = getProjectStatsQueryKey("react");
    vi.setSystemTime(new Date("2024-03-06T00:30:00Z"));

    expect(beforeMidnight).toEqual(["project-stats", "react"]);
    expect(getProjectStatsQueryKey("react")).toEqual(beforeMidnight);
  });

  test("search key includes the search term", () => {
    expect(getSearchNPMRegistryQueryKey("vue")).toEqual([
      "projects-suggestions",
      "vue",
    ]);
  });

  test.each(["  React ", "REACT", "react"])(
    "search key normalizes %j to one entry",
    (term) => {
      expect(getSearchNPMRegistryQueryKey(term)).toEqual([
        "projects-suggestions",
        "react",
      ]);
    },
  );

  test("normalizeSearchTerm trims and lowercases", () => {
    expect(normalizeSearchTerm("  Vue Router ")).toBe("vue router");
  });
});
