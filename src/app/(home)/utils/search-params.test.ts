import { SELECTED_PROJECTS_LIMIT } from "@/lib/config/constants";
import { describe, expect, it, vi } from "vitest";
import getLocalStorageValue from "../../../lib/utils/getLocalStorageValue";
import {
  constructCompareUrl,
  constructNewUrl,
  decodeProjectName,
  encodeProjectName,
  getCurrentProjects,
  getInitialChartScale,
  getInitialProjects,
  getInitialTimePeriod,
  getOtherParamsString,
  getProjectsQueryString,
  getProjectsUrlUpdate,
  isComparePathname,
  projectsToSlug,
  slugToProjects,
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

describe("getInitialTimePeriod", () => {
  it("should return valid time period when provided", () => {
    expect(getInitialTimePeriod("months-1")).toBe("months-1");
    expect(getInitialTimePeriod("years-2")).toBe("years-2");
    expect(getInitialTimePeriod("all-time")).toBe("all-time");
  });

  it("should return default 'all-time' for invalid time period", () => {
    expect(getInitialTimePeriod("invalid")).toBe("all-time");
    expect(getInitialTimePeriod(null)).toBe("all-time");
  });
});

describe("getInitialChartScale", () => {
  it("should return valid chart scale when provided", () => {
    expect(getInitialChartScale("linear")).toBe("linear");
    expect(getInitialChartScale("logarithmic")).toBe("logarithmic");
  });

  it("should return default 'linear' for invalid chart scale", () => {
    expect(getInitialChartScale("invalid")).toBe("linear");
    expect(getInitialChartScale(null)).toBe("linear");
  });
});

describe("projectsToSlug / slugToProjects round-trip", () => {
  const roundTripCases = [
    ["react", "vue", "svelte"],
    ["@angular/core", "react"],
    ["react-dom", "vue"],
    ["some-vs-name", "x"],
  ];

  roundTripCases.forEach((projects) => {
    it(`round-trips ${JSON.stringify(projects)}`, () => {
      expect(slugToProjects(projectsToSlug(projects))).toEqual(projects);
    });
  });

  it("produces a human-readable slug for non-scoped packages", () => {
    expect(projectsToSlug(["react", "vue"])).toBe("react-vs-vue");
  });

  it("returns an empty array for empty or invalid slugs", () => {
    expect(slugToProjects("")).toEqual([]);
    expect(slugToProjects(undefined as unknown as string)).toEqual([]);
  });

  it(`truncates to ${SELECTED_PROJECTS_LIMIT} projects`, () => {
    const projects = Array.from(
      { length: SELECTED_PROJECTS_LIMIT + 5 },
      (_, i) => `project${i + 1}`,
    );
    const result = slugToProjects(projectsToSlug(projects));
    expect(result).toHaveLength(SELECTED_PROJECTS_LIMIT);
    expect(result).toEqual(projects.slice(0, SELECTED_PROJECTS_LIMIT));
  });

  it("survives the compare route's array-join pipeline for scoped packages", () => {
    const projects = ["react", "@angular/core"];
    const slugSegments = projectsToSlug(projects).split("/");
    expect(slugToProjects(slugSegments.join("/"))).toEqual(projects);
  });

  it("does not throw on a lone percent sign and returns an empty array", () => {
    expect(() => slugToProjects("100%")).not.toThrow();
    expect(slugToProjects("100%")).toEqual([]);
    expect(slugToProjects("100%25")).toEqual([]);
  });

  it("returns an empty array when any name is invalid", () => {
    expect(slugToProjects("arbitrary text")).toEqual([]);
    expect(slugToProjects("react-vs-<script>")).toEqual([]);
    expect(slugToProjects("react-vs-")).toEqual([]);
  });

  it("accepts already-decoded input", () => {
    expect(slugToProjects("date-fns-vs-moment")).toEqual([
      "date-fns",
      "moment",
    ]);
    expect(slugToProjects("@angular/core-vs-react")).toEqual([
      "@angular/core",
      "react",
    ]);
  });

  it("accepts segments re-encoded by Next.js", () => {
    expect(slugToProjects("%40angular/core-vs-react")).toEqual([
      "@angular/core",
      "react",
    ]);
    expect(slugToProjects("date%252Dfns-vs-moment")).toEqual([
      "date-fns",
      "moment",
    ]);
  });
});

describe("decodeProjectName safety", () => {
  it("falls back to the raw value on malformed input", () => {
    expect(decodeProjectName("100%")).toBe("100%");
  });
});

describe("isComparePathname", () => {
  it("detects compare routes only", () => {
    expect(isComparePathname("/compare/react-vs-vue")).toBe(true);
    expect(isComparePathname("/")).toBe(false);
    expect(isComparePathname("/categories/frameworks")).toBe(false);
  });
});

describe("constructCompareUrl", () => {
  it("builds a compare path without a projects param, keeping other params", () => {
    const searchParams = new URLSearchParams(
      "projects=react,vue&period=years-1&scale=logarithmic&mode=normalized&ref=x",
    );
    expect(constructCompareUrl(["react", "date-fns"], searchParams, ",")).toBe(
      "/compare/react-vs-date%2Dfns?period=years-1&scale=logarithmic&mode=normalized&ref=x",
    );
  });

  it("builds a bare compare path when there are no params", () => {
    expect(
      constructCompareUrl(["react", "vue"], new URLSearchParams(), ","),
    ).toBe("/compare/react-vs-vue");
  });

  it("navigates home with an explicit empty selection when nothing is selected", () => {
    expect(constructCompareUrl([], new URLSearchParams(), ",")).toBe(
      "/?projects=",
    );
    expect(
      constructCompareUrl([], new URLSearchParams("period=years-1"), ","),
    ).toBe("/?projects=&period=years-1");
  });
});

describe("getProjectsUrlUpdate", () => {
  it("returns null on initial compare load when the URL already matches", () => {
    expect(
      getProjectsUrlUpdate(
        "/compare/react-vs-date%2Dfns",
        new URLSearchParams("period=years-1"),
        ["react", "date-fns"],
        ",",
      ),
    ).toBeNull();
  });

  it("treats decoded and encoded compare paths as equal", () => {
    expect(
      getProjectsUrlUpdate(
        "/compare/react-vs-date-fns",
        new URLSearchParams(),
        ["react", "date-fns"],
        ",",
      ),
    ).toBeNull();
    expect(
      getProjectsUrlUpdate(
        "/compare/%40angular/core-vs-react",
        new URLSearchParams(),
        ["@angular/core", "react"],
        ",",
      ),
    ).toBeNull();
  });

  it("updates the compare path when a package is removed", () => {
    expect(
      getProjectsUrlUpdate(
        "/compare/react-vs-vue-vs-svelte",
        new URLSearchParams("scale=logarithmic"),
        ["react", "svelte"],
        ",",
      ),
    ).toBe("/compare/react-vs-svelte?scale=logarithmic");
  });

  it("drops a stale projects param on compare pages", () => {
    expect(
      getProjectsUrlUpdate(
        "/compare/react-vs-vue",
        new URLSearchParams("projects=react"),
        ["react", "vue"],
        ",",
      ),
    ).toBe("/compare/react-vs-vue");
  });

  it("navigates home when the compare selection becomes empty", () => {
    expect(
      getProjectsUrlUpdate(
        "/compare/react-vs-vue",
        new URLSearchParams(),
        [],
        ",",
      ),
    ).toBe("/?projects=");
  });

  it("keeps home-page query behavior", () => {
    expect(
      getProjectsUrlUpdate("/", new URLSearchParams(), ["react", "vue"], ","),
    ).toBe("/?projects=react,vue");
    expect(
      getProjectsUrlUpdate(
        "/",
        new URLSearchParams("projects=react,vue"),
        ["react", "vue"],
        ",",
      ),
    ).toBeNull();
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

  it("should ignore local storage when projectsParam is null", () => {
    vi.mocked(getLocalStorageValue).mockReturnValue(["localProject1"]);

    const result = getInitialProjects(null, delimiter);

    expect(result).toEqual([]);
    expect(getLocalStorageValue).not.toHaveBeenCalled();
  });

  it(`should limit the number of projects to ${SELECTED_PROJECTS_LIMIT} when more than ${SELECTED_PROJECTS_LIMIT} are provided`, () => {
    const projectsParam = Array(15)
      .fill("project")
      .map((p, i) => `${p}${i + 1}`)
      .join(delimiter);
    const result = getInitialProjects(projectsParam, delimiter);
    expect(result).toHaveLength(SELECTED_PROJECTS_LIMIT);
    expect(result).toEqual(
      Array(SELECTED_PROJECTS_LIMIT)
        .fill("project")
        .map((p, i) => `${p}${i + 1}`),
    );
  });
});

describe("getOtherParamsString", () => {
  it("should return a query string excluding the specified keys", () => {
    const searchParams = new URLSearchParams({
      projects: "project1,project2",
      period: "months-1",
      scale: "linear",
      user: "testUser",
      page: "1",
    });
    const result = getOtherParamsString(searchParams, [
      "projects",
      "period",
      "scale",
    ]);
    expect(result).toBe("user=testUser&page=1");
  });

  it("should return an empty string if all keys are excluded", () => {
    const searchParams = new URLSearchParams({
      projects: "project1,project2",
      period: "months-1",
      scale: "linear",
    });
    const result = getOtherParamsString(searchParams, [
      "projects",
      "period",
      "scale",
    ]);
    expect(result).toBe("");
  });

  it("should return the original query string if the exclude keys are not present", () => {
    const searchParams = new URLSearchParams({
      user: "testUser",
      page: "1",
    });
    const result = getOtherParamsString(searchParams, [
      "projects",
      "period",
      "scale",
    ]);
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

describe("getCurrentProjects", () => {
  const delimiter = ",";

  it("should return an empty array when the projects param is absent", () => {
    const searchParams = new URLSearchParams();
    expect(getCurrentProjects(searchParams, delimiter)).toEqual([]);
  });

  it("should return an empty array when the projects param is empty", () => {
    const searchParams = new URLSearchParams({ projects: "" });
    expect(getCurrentProjects(searchParams, delimiter)).toEqual([]);
  });

  it("should decode multiple projects split by the delimiter", () => {
    const searchParams = new URLSearchParams();
    searchParams.set("projects", "react,vue");
    expect(getCurrentProjects(searchParams, delimiter)).toEqual([
      "react",
      "vue",
    ]);
  });

  it("should round-trip scoped and multi-project selections through the encoding path", () => {
    const projects = ["@angular/core", "@dnd/core"];
    const searchParams = new URLSearchParams();
    searchParams.set(
      "projects",
      projects.map(encodeProjectName).join(delimiter),
    );

    const currentProjects = getCurrentProjects(searchParams, delimiter);
    expect(currentProjects).toEqual(projects);
    expect(getProjectsQueryString(currentProjects, delimiter)).toBe(
      getProjectsQueryString(projects, delimiter),
    );
  });
});

describe("constructNewUrl", () => {
  const delimiter = ",";

  it("should return URL with all params when all are provided", () => {
    const pathname = "/projects";
    const selectedProjects = ["project1", "project2"];
    const timePeriod = "months-1";
    const chartScale = "logarithmic";
    const otherParams = "user=testUser&page=1";
    const result = constructNewUrl(
      pathname,
      selectedProjects,
      timePeriod,
      chartScale,
      otherParams,
      delimiter,
    );
    expect(result).toBe(
      "/projects?projects=project1,project2&period=months-1&scale=logarithmic&user=testUser&page=1",
    );
  });

  it("should return URL with only projects when time period and scale are defaults", () => {
    const pathname = "/projects";
    const selectedProjects = ["project1", "project2"];
    const timePeriod = "all-time";
    const chartScale = "linear";
    const otherParams = "";
    const result = constructNewUrl(
      pathname,
      selectedProjects,
      timePeriod,
      chartScale,
      otherParams,
      delimiter,
    );
    expect(result).toBe("/projects?projects=project1,project2");
  });

  it("should return URL with only period and scale when projects is empty", () => {
    const pathname = "/projects";
    const selectedProjects: string[] = [];
    const timePeriod = "months-1";
    const chartScale = "logarithmic";
    const otherParams = "";
    const result = constructNewUrl(
      pathname,
      selectedProjects,
      timePeriod,
      chartScale,
      otherParams,
      delimiter,
    );
    expect(result).toBe("/projects?period=months-1&scale=logarithmic");
  });

  it("should return pathname only when all params are defaults or empty", () => {
    const pathname = "/projects";
    const selectedProjects: string[] = [];
    const timePeriod = "all-time";
    const chartScale = "linear";
    const otherParams = "";
    const result = constructNewUrl(
      pathname,
      selectedProjects,
      timePeriod,
      chartScale,
      otherParams,
      delimiter,
    );
    expect(result).toBe("/projects");
  });
});
