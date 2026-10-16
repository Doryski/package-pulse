import { describe, expect, test } from "vitest";
import { SELECTED_PROJECTS_LIMIT } from "@/lib/config/constants";
import {
  COMPARE_PATH_PREFIX,
  decodeProjectName,
  encodeProjectName,
  projectsToComparePath,
  projectsToSlug,
  slugToProjects,
  slugifyTitle,
} from "./slug";

describe("encodeProjectName", () => {
  test("keeps @, / and , readable while encoding the rest", () => {
    expect(encodeProjectName("@scope/pkg")).toBe("@scope/pkg");
    expect(encodeProjectName("a,b")).toBe("a,b");
    expect(encodeProjectName("a b")).toBe("a%20b");
  });
});

describe("decodeProjectName", () => {
  test("decodes percent sequences", () => {
    expect(decodeProjectName("a%20b")).toBe("a b");
  });

  test("returns input when decoding fails", () => {
    expect(decodeProjectName("%E0%A4%A")).toBe("%E0%A4%A");
  });
});

describe("projectsToSlug", () => {
  test("joins projects with -vs- and escapes dashes", () => {
    expect(projectsToSlug(["react", "react-dom"])).toBe("react-vs-react%2Ddom");
  });

  test("handles a single project and empty list", () => {
    expect(projectsToSlug(["react"])).toBe("react");
    expect(projectsToSlug([])).toBe("");
  });
});

describe("projectsToComparePath", () => {
  test("prefixes the slug", () => {
    expect(projectsToComparePath(["a", "b"])).toBe(
      `${COMPARE_PATH_PREFIX}a-vs-b`,
    );
  });
});

describe("slugToProjects", () => {
  test("returns empty array for empty slug", () => {
    expect(slugToProjects("")).toEqual([]);
  });

  test("round-trips projects with dashes and scopes", () => {
    const projects = ["react-dom", "@types/node", "vue"];

    expect(slugToProjects(projectsToSlug(projects))).toEqual(projects);
  });

  test("decodes multiply-encoded segments", () => {
    expect(slugToProjects("react%252Ddom")).toEqual(["react-dom"]);
  });

  test("returns empty array when any package name is invalid", () => {
    expect(slugToProjects("react-vs-Invalid Name!")).toEqual([]);
  });

  test("limits the number of projects", () => {
    const names = Array.from(
      { length: SELECTED_PROJECTS_LIMIT + 2 },
      (_, index) => `pkg${index}`,
    );

    expect(slugToProjects(names.join("-vs-"))).toEqual(
      names.slice(0, SELECTED_PROJECTS_LIMIT),
    );
  });
});

describe("slugifyTitle", () => {
  test("lowercases, removes ampersands and hyphenates spaces", () => {
    expect(slugifyTitle("  UI & Components   Libs ")).toBe(
      "ui-components-libs",
    );
  });
});
