import { describe, expect, it } from "vitest";
import { formatProjectsList, formatSelectionHeading } from "./projectsLabel";

describe("projectsLabel", () => {
  it("joins project names with vs", () => {
    expect(formatProjectsList(["react", "vue", "svelte"])).toBe(
      "react vs vue vs svelte",
    );
  });

  it("builds the selection heading copy", () => {
    expect(formatSelectionHeading(["react", "@angular/core"])).toBe(
      "react vs @angular/core npm downloads",
    );
  });
});
