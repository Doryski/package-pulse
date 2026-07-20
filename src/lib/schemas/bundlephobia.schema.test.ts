import { describe, expect, it } from "vitest";
import { BundlephobiaSchema } from "./bundlephobia.schema";

describe("BundlephobiaSchema", () => {
  it("parses a realistic full payload", () => {
    const result = BundlephobiaSchema.parse({
      size: 12345,
      gzip: 4567,
      dependencyCount: 8,
      hasJSModule: true,
      hasSideEffects: false,
    });

    expect(result).toEqual({
      size: 12345,
      gzip: 4567,
      dependencyCount: 8,
      hasJSModule: true,
      hasSideEffects: false,
    });
  });

  it("does not throw on an empty object, yielding undefined fields", () => {
    const result = BundlephobiaSchema.safeParse({});

    expect(result.success).toBe(true);
    expect(result.data).toEqual({
      size: undefined,
      gzip: undefined,
      dependencyCount: undefined,
      hasJSModule: undefined,
      hasSideEffects: undefined,
    });
  });

  it("catches malformed field types into undefined", () => {
    const result = BundlephobiaSchema.safeParse({
      size: "not-a-number",
      gzip: null,
      dependencyCount: 8,
    });

    expect(result.success).toBe(true);
    expect(result.data?.size).toBeUndefined();
    expect(result.data?.gzip).toBeUndefined();
    expect(result.data?.dependencyCount).toBe(8);
  });
});
