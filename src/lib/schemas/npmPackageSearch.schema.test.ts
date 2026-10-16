import { describe, expect, test } from "vitest";
import { NPMPackageSearchSchema } from "./npmPackageSearch.schema";

const item = {
  package: {
    name: "react",
    version: "19.0.0",
    date: "2025-01-01T00:00:00.000Z",
    links: { npm: "https://npmjs.com/package/react" },
    maintainers: [{ username: "a", email: "a@b.c" }],
  },
  score: {
    final: 0.9,
    detail: { quality: 0.9, popularity: 0.9, maintenance: 0.9 },
  },
  searchScore: 1,
};

describe("NPMPackageSearchSchema", () => {
  test("parses a minimal payload", () => {
    const result = NPMPackageSearchSchema.parse({
      objects: [item],
      total: 1,
      time: "now",
    });
    expect(result.objects[0]?.package.name).toBe("react");
  });

  test("rejects a payload with missing score", () => {
    const { score: _score, ...withoutScore } = item;
    const result = NPMPackageSearchSchema.safeParse({
      objects: [withoutScore],
      total: 1,
      time: "now",
    });
    expect(result.success).toBe(false);
  });
});
