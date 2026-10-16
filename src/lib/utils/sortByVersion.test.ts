import { describe, expect, test } from "vitest";
import sortByVersion from "./sortByVersion";

type Input = Parameters<typeof sortByVersion>[0];

const make = (...versions: string[]) =>
  versions.map((version) => ({ version })) as unknown as Input;

const versionsOf = (items: Input) => items.map((item) => item.version);

describe("sortByVersion", () => {
  test("sorts by major, minor and patch numerically", () => {
    const result = sortByVersion(
      make("2.0.0", "1.10.0", "1.2.10", "1.2.9", "1.9.0", "10.0.0"),
    );

    expect(versionsOf(result)).toEqual([
      "1.2.9",
      "1.2.10",
      "1.9.0",
      "1.10.0",
      "2.0.0",
      "10.0.0",
    ]);
  });

  test("does not mutate the input", () => {
    const input = make("2.0.0", "1.0.0");

    sortByVersion(input);

    expect(versionsOf(input)).toEqual(["2.0.0", "1.0.0"]);
  });

  test("keeps order when a version is not in x.y.z form", () => {
    const result = sortByVersion(make("2.0.0", "1.0", "1.0.0"));

    expect(versionsOf(result)).toEqual(["2.0.0", "1.0", "1.0.0"]);
  });

  test("returns empty array for empty input", () => {
    expect(sortByVersion(make())).toEqual([]);
  });
});
