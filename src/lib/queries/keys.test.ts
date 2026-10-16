import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { getProjectStatsQueryKey, getSearchNPMRegistryQueryKey } from "./keys";

describe("query keys", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-03-05T23:30:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test("project stats key includes name and UTC date", () => {
    expect(getProjectStatsQueryKey("react")).toEqual([
      "project-stats",
      "react",
      "2024-03-05",
    ]);
  });

  test("search key includes the search term", () => {
    expect(getSearchNPMRegistryQueryKey("vue")).toEqual([
      "projects-suggestions",
      "vue",
    ]);
  });
});
