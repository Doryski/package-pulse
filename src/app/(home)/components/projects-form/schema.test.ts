import { describe, expect, it } from "vitest";
import { ProjectsSearchFormSchema } from "./schema";

describe("ProjectsSearchFormSchema", () => {
  it("accepts a search string and projects list", () => {
    const values = { search: "react", projects: ["react", "vue"] };

    expect(ProjectsSearchFormSchema.parse(values)).toEqual(values);
  });

  it("asks for a project name when search is missing", () => {
    const result = ProjectsSearchFormSchema.safeParse({ projects: [] });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe(
      "Please enter a project name.",
    );
  });

  it("falls back to the default message for a non-string search", () => {
    const result = ProjectsSearchFormSchema.safeParse({
      search: 42,
      projects: [],
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).not.toBe(
      "Please enter a project name.",
    );
  });

  it("rejects non-string projects", () => {
    const result = ProjectsSearchFormSchema.safeParse({
      search: "",
      projects: [1],
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["projects", 0]);
  });
});
