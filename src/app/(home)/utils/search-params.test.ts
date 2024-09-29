import { describe, expect, it, vi } from "vitest";
import getLocalStorageValue from "../../../lib/utils/getLocalStorageValue";
import {
  constructNewUrl,
  decodeProjectName,
  encodeProjectName,
  getInitialProjects,
  getOtherParamsString,
  getProjectsQueryString,
} from "./search-params";

vi.mock("../../../lib/utils/getLocalStorageValue");

describe("encodeProjectName", () => {
  it("should encode special characters except for commas, at signs, and forward slashes", () => {
    const testCases = [
      { input: "Project Name", expected: "Project%20Name" },
      { input: "Project,Name", expected: "Project,Name" },
      { input: "user@example.com", expected: "user@example.com" },
      { input: "path/to/project", expected: "path/to/project" },
      {
        input: "Project Name: Special & Characters!",
        expected: "Project%20Name%3A%20Special%20%26%20Characters!",
      },
      {
        input: "Project,@/With,@/All,@/Special,@/Cases",
        expected: "Project,@/With,@/All,@/Special,@/Cases",
      },
    ];

    testCases.forEach(({ input, expected }) => {
      expect(encodeProjectName(input)).toBe(expected);
    });
  });
});

describe("decodeProjectName", () => {
  it("should decode URL-encoded strings", () => {
    const testCases = [
      { input: "Project%20Name", expected: "Project Name" },
      { input: "Project,Name", expected: "Project,Name" },
      { input: "user@example.com", expected: "user@example.com" },
      { input: "path/to/project", expected: "path/to/project" },
      {
        input: "Project%20Name%3A%20Special%20%26%20Characters%21",
        expected: "Project Name: Special & Characters!",
      },
      {
        input: "Project,@/With,@/All,@/Special,@/Cases",
        expected: "Project,@/With,@/All,@/Special,@/Cases",
      },
    ];

    testCases.forEach(({ input, expected }) => {
      expect(decodeProjectName(input)).toBe(expected);
    });
  });
});

describe("getInitialProjects", () => {
  const delimiter = ",";

  it("should return decoded projects when projectsParam is provided", () => {
    const projectsParam = "project1%21,project2%21";
    const result = getInitialProjects(projectsParam, delimiter);
    expect(result).toEqual(["project1!", "project2!"]);
  });

  it("should return an empty array when projectsParam is null", () => {
    const result = getInitialProjects(null, delimiter);
    expect(result).toEqual([]);
  });

  it("should return an empty array when decodedProjectsParam is empty", () => {
    const projectsParam = "";
    const result = getInitialProjects(projectsParam, delimiter);
    expect(result).toEqual([]);
  });

  it("should return projects from local storage when projectsParam is null and local storage has projects", () => {
    const localStorageProjects = ["localProject1", "localProject2"];
    vi.mocked(getLocalStorageValue).mockReturnValue(localStorageProjects);

    const result = getInitialProjects(null, delimiter);
    expect(result).toEqual(localStorageProjects);
  });

  it("should return an empty array when projectsParam is null and local storage is empty", () => {
    vi.mocked(getLocalStorageValue).mockReturnValue(null);

    const result = getInitialProjects(null, delimiter);
    expect(result).toEqual([]);
  });

  it("should return projects from local storage when projectsParam is null", () => {
    const localStorageProjects = ["localProject1", "localProject2"];
    vi.mocked(getLocalStorageValue).mockReturnValue(localStorageProjects);

    const result = getInitialProjects(null, delimiter);
    expect(result).toEqual(localStorageProjects);
  });

  it("should return an empty array when projectsParam is null and local storage is empty", () => {
    vi.mocked(getLocalStorageValue).mockReturnValue(null);

    const result = getInitialProjects(null, delimiter);
    expect(result).toEqual([]);
  });

  it("should limit the number of projects to 10 when more than 10 are provided", () => {
    const projectsParam = Array(15)
      .fill("project")
      .map((p, i) => `${p}${i + 1}`)
      .join(delimiter);
    const result = getInitialProjects(projectsParam, delimiter);
    expect(result).toHaveLength(10);
    expect(result).toEqual(
      Array(10)
        .fill("project")
        .map((p, i) => `${p}${i + 1}`),
    );
  });
});

describe("getOtherParamsString", () => {
  it("should return a query string excluding the specified key", () => {
    const searchParams = new URLSearchParams({
      projects: "project1,project2",
      user: "testUser",
      page: "1",
    });
    const result = getOtherParamsString(searchParams, "projects");
    expect(result).toBe("user=testUser&page=1");
    const result2 = getOtherParamsString(searchParams, "user");
    expect(result2).toBe("projects=project1,project2&page=1");
  });

  it("should return an empty string if all keys are excluded", () => {
    const searchParams = new URLSearchParams({
      projects: "project1,project2",
    });
    const result = getOtherParamsString(searchParams, "projects");
    expect(result).toBe("");
  });

  it("should return the original query string if the exclude key is not present", () => {
    const searchParams = new URLSearchParams({
      user: "testUser",
      page: "1",
    });
    const result = getOtherParamsString(searchParams, "projects");
    expect(result).toBe("user=testUser&page=1");
  });
});

describe("getProjectsQueryString", () => {
  it("should return a query string for the projects array", () => {
    const projects = ["project1", "project2"];
    const delimiter = ",";
    const result = getProjectsQueryString(projects, delimiter);
    expect(result).toBe("projects=project1,project2");
  });

  it("should return an empty projects query string if the projects array is empty", () => {
    const projects: string[] = [];
    const delimiter = ",";
    const result = getProjectsQueryString(projects, delimiter);
    expect(result).toBe("projects=");
  });

  it("should encode project names correctly in the query string", () => {
    const projects = ["@angular/core", "@dnd/core"];
    const delimiter = ",";
    const result = getProjectsQueryString(projects, delimiter);
    expect(result).toBe("projects=@angular/core,@dnd/core");
  });
});

describe("constructNewUrl", () => {
  const delimiter = ",";

  it("should return URL with projects query string and other params", () => {
    const pathname = "/projects";
    const selectedProjects = ["project1", "project2"];
    const otherParams = "user=testUser&page=1";
    const result = constructNewUrl(
      pathname,
      selectedProjects,
      otherParams,
      delimiter,
    );
    expect(result).toBe(
      "/projects?projects=project1,project2&user=testUser&page=1",
    );
  });

  it("should return URL with only projects query string if other params are empty", () => {
    const pathname = "/projects";
    const selectedProjects = ["project1", "project2"];
    const otherParams = "";
    const result = constructNewUrl(
      pathname,
      selectedProjects,
      otherParams,
      delimiter,
    );
    expect(result).toBe("/projects?projects=project1,project2");
  });

  it("should return URL with only other params if selected projects are empty", () => {
    const pathname = "/projects";
    const selectedProjects: string[] = [];
    const otherParams = "user=testUser&page=1";
    const result = constructNewUrl(
      pathname,
      selectedProjects,
      otherParams,
      delimiter,
    );
    expect(result).toBe("/projects?user=testUser&page=1");
  });

  it("should return pathname if both selected projects and other params are empty", () => {
    const pathname = "/projects";
    const selectedProjects: string[] = [];
    const otherParams = "";
    const result = constructNewUrl(
      pathname,
      selectedProjects,
      otherParams,
      delimiter,
    );
    expect(result).toBe("/projects");
  });
});
