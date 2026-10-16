import { describe, expect, test } from "vitest";
import {
  isEmptyArray,
  isNonEmptyArray,
  isSingleItemArray,
} from "./array-utils";

describe("array-utils", () => {
  test.each([
    { input: [], empty: true, single: false, nonEmpty: false },
    { input: [1], empty: false, single: true, nonEmpty: true },
    { input: [1, 2], empty: false, single: false, nonEmpty: true },
  ])(
    "guards for length $input.length",
    ({ input, empty, single, nonEmpty }) => {
      expect(isEmptyArray(input)).toBe(empty);
      expect(isSingleItemArray(input)).toBe(single);
      expect(isNonEmptyArray(input)).toBe(nonEmpty);
    },
  );
});
