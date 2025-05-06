import { describe, expect, test } from "vitest";
import { fetchSimilarProjects } from "./fetchSimilarProjects";

describe("findSimilarProjects", () => {
  test("should find similar validation libraries", async () => {
    const result = await fetchSimilarProjects(["zod"]);
    console.log("Zod similar projects:", result);

    expect(result.length).toBeGreaterThan(0);
    expect(result.some((project) => project === "yup")).toBe(true);

    const yupProject = result.find((p) => p === "yup");
    expect(yupProject).toBeDefined();
  });

  test("should find similar UI libraries", async () => {
    const result = await fetchSimilarProjects(["react"]);
    console.log("React similar projects:", result);

    expect(result.some((project) => project === "vue")).toBe(true);
    const vueProject = result.find((p) => p === "vue");
    expect(vueProject).toBeDefined();
  });

  test("should find similar state management libraries", async () => {
    const result = await fetchSimilarProjects(["redux"]);
    console.log("Redux similar projects:", result);

    expect(result.some((project) => project === "zustand")).toBe(true);
    const zustandProject = result.find((p) => p === "zustand");
    expect(zustandProject).toBeDefined();
  });
});
