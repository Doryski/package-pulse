import { describe, expect, it } from "vitest";
import { DepsDevProjectSchema, DepsDevVersionSchema } from "./depsDev.schema";

describe("DepsDevVersionSchema", () => {
  it("parses a realistic full payload", () => {
    const result = DepsDevVersionSchema.parse({
      licenses: ["MIT"],
      advisoryKeys: [{ id: "GHSA-xxxx" }],
      relatedProjects: [
        {
          projectKey: { id: "github.com/facebook/react" },
          relationType: "SOURCE_REPO",
        },
      ],
    });

    expect(result.licenses).toEqual(["MIT"]);
    expect(result.advisoryKeys).toEqual([{ id: "GHSA-xxxx" }]);
    expect(result.relatedProjects?.[0]?.relationType).toBe("SOURCE_REPO");
  });

  it("does not throw on an empty object, yielding undefined fields", () => {
    const result = DepsDevVersionSchema.safeParse({});

    expect(result.success).toBe(true);
    expect(result.data).toEqual({
      licenses: undefined,
      advisoryKeys: undefined,
      relatedProjects: undefined,
    });
  });

  it("does not throw on a 404-style payload", () => {
    const result = DepsDevVersionSchema.safeParse({
      code: "NOT_FOUND",
      message: "version not found",
    });

    expect(result.success).toBe(true);
    expect(result.data?.licenses).toBeUndefined();
  });

  it("catches malformed field types into undefined", () => {
    const result = DepsDevVersionSchema.safeParse({
      licenses: "MIT",
      advisoryKeys: 42,
    });

    expect(result.success).toBe(true);
    expect(result.data?.licenses).toBeUndefined();
    expect(result.data?.advisoryKeys).toBeUndefined();
  });
});

describe("DepsDevProjectSchema", () => {
  it("parses a realistic full payload", () => {
    const result = DepsDevProjectSchema.parse({
      openIssuesCount: 120,
      starsCount: 200000,
      forksCount: 40000,
      scorecard: { overallScore: 7.5 },
    });

    expect(result).toEqual({
      openIssuesCount: 120,
      starsCount: 200000,
      forksCount: 40000,
      scorecard: { overallScore: 7.5 },
    });
  });

  it("does not throw on an empty object, yielding undefined fields", () => {
    const result = DepsDevProjectSchema.safeParse({});

    expect(result.success).toBe(true);
    expect(result.data).toEqual({
      openIssuesCount: undefined,
      starsCount: undefined,
      forksCount: undefined,
      scorecard: undefined,
    });
  });

  it("does not throw on a 404-style payload", () => {
    const result = DepsDevProjectSchema.safeParse({
      code: "NOT_FOUND",
      message: "project not found",
    });

    expect(result.success).toBe(true);
    expect(result.data?.starsCount).toBeUndefined();
  });
});
