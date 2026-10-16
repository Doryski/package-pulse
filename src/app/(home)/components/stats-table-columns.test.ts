import { describe, expect, it } from "vitest";
import {
  STICKY_HEAD_CLASS_NAME,
  statsColumnLabel,
  statsTableColumns,
} from "./stats-table-columns";

describe("statsTableColumns", () => {
  it("lists the columns in display order", () => {
    expect(statsTableColumns.map(({ label }) => label)).toEqual([
      "Project name",
      "Weekly",
      "Monthly",
      "Yearly",
      "YoY Week",
      "YoY Month",
      "Vibe Coding Era",
      "Break Drop",
    ]);
  });

  it("has unique column keys", () => {
    const keys = statsTableColumns.map(({ column }) => column);

    expect(new Set(keys).size).toBe(keys.length);
  });

  it("marks only the project name column as sticky", () => {
    expect(
      statsTableColumns.filter(({ isSticky }) => isSticky).map((c) => c.column),
    ).toEqual(["projectName"]);
  });

  it("resolves a label by column key", () => {
    expect(statsColumnLabel("yoyMonth")).toBe("YoY Month");
  });

  it("exposes the sticky head classes", () => {
    expect(STICKY_HEAD_CLASS_NAME).toContain("sticky left-0 z-20");
  });
});
