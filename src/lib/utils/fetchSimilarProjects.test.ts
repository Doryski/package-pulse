/**
 * @vitest-environment node
 */
import { describe, expect, test } from "vitest";
import { fetchSimilarProjects } from "./fetchSimilarProjects";

describe("findSimilarProjects", () => {
  test("should find similar validation libraries", async () => {
    const result = await fetchSimilarProjects([
      {
        projectName: "zod",
        keywords: ["validation", "schema"],
        description:
          "Zod is a schema declaration and validation library for TypeScript.",
      },
    ]);

    expect(result.length).toBeGreaterThan(0);
    expect(result.some((project) => project === "yup")).toBe(true);

    const yupProject = result.find((p) => p === "yup");
    expect(yupProject).toBeDefined();
  });

  test("should find similar UI libraries", async () => {
    const result = await fetchSimilarProjects([
      {
        projectName: "react",
        keywords: ["frontend", "framework"],
        description:
          "React is a JavaScript library for building user interfaces.",
      },
    ]);

    expect(result.some((project) => project === "vue")).toBe(true);
    const vueProject = result.find((p) => p === "vue");
    expect(vueProject).toBeDefined();
  });

  test("should find similar state management libraries", async () => {
    const result = await fetchSimilarProjects([
      {
        projectName: "redux",
        keywords: ["state", "management"],
        description:
          "Redux is a state management library for JavaScript applications.",
      },
    ]);

    expect(result.some((project) => project === "zustand")).toBe(true);
    const zustandProject = result.find((p) => p === "zustand");
    expect(zustandProject).toBeDefined();
  });

  test("should find similar state management libraries for a non-popular project", async () => {
    const result = await fetchSimilarProjects([
      {
        projectName: "eventrix",
        keywords: ["store"],
        description:
          "A system for managing the state of the application based on the events broadcast in the application.",
      },
    ]);

    expect(result.some((project) => project === "redux")).toBe(true);
    const reduxProject = result.find((p) => p === "redux");
    expect(reduxProject).toBeDefined();
  });
});
