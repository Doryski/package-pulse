import { describe, expect, it } from "vitest";
import {
  buildShareToXUrl,
  ChartData,
  filterByTimePeriod,
  formatLatestVersion,
  formatNormalizedLabel,
  formatVersion,
  formatXAxisTick,
  formatYAxisTick,
  getLatestVersion,
  getSeriesKeys,
  getYAxisDomain,
  nullifyZeroValues,
} from "./line-chart-utils";

const NOW = new Date("2024-06-15T00:00:00Z");

const TIMELINE = [
  "2019-01-01",
  "2022-07-01",
  "2023-03-01",
  "2023-09-01",
  "2024-01-01",
  "2024-04-01",
  "2024-06-01",
] as const;

const SERIES_KEY: string = "react";

const toChartData = (time: ChartData["time"], value: number) =>
  ({ time, [SERIES_KEY]: value }) as ChartData;

const DATA = TIMELINE.map(toChartData);

const PERIOD_CASES = [
  ["months-1", ["2024-06-01"]],
  ["months-3", ["2024-04-01", "2024-06-01"]],
  ["months-6", ["2024-01-01", "2024-04-01", "2024-06-01"]],
  ["years-1", ["2023-09-01", "2024-01-01", "2024-04-01", "2024-06-01"]],
  [
    "years-2",
    [
      "2022-07-01",
      "2023-03-01",
      "2023-09-01",
      "2024-01-01",
      "2024-04-01",
      "2024-06-01",
    ],
  ],
  ["years-5", TIMELINE.slice(1)],
  ["all-time", TIMELINE],
] as const;

const VERSIONS = [
  { version: "1.10.0", date: "2024-03-01" },
  { version: "1.2.0", date: "2024-01-01" },
  { version: "1.9.5", date: "2024-02-01" },
];

describe("filterByTimePeriod", () => {
  it.each(PERIOD_CASES)("keeps rows within %s", (period, expected) => {
    const result = filterByTimePeriod(DATA, period, NOW);
    expect(result.map((row) => row.time)).toEqual([...expected]);
  });

  it("accepts Date instances as time", () => {
    const rows = [toChartData(new Date("2024-06-10"), 1)];
    expect(filterByTimePeriod(rows, "months-1", NOW)).toHaveLength(1);
  });

  it("throws on an unknown period", () => {
    const invalidPeriod = "decade" as Parameters<typeof filterByTimePeriod>[1];
    expect(() => filterByTimePeriod(DATA, invalidPeriod, NOW)).toThrow(
      "Invalid time period",
    );
  });
});

describe("getSeriesKeys", () => {
  it("returns an empty list for no rows", () => {
    expect(getSeriesKeys([], "time")).toEqual([]);
  });

  it("returns keys of the first row except the x key", () => {
    expect(
      getSeriesKeys([{ time: "t", a: 1, b: 2 }, { c: 3 }], "time"),
    ).toEqual(["a", "b"]);
  });
});

describe("formatYAxisTick", () => {
  it.each([0, -5])("renders %s as 0 on a logarithmic scale", (value) => {
    expect(formatYAxisTick(value, "logarithmic")).toBe("0");
  });

  it("formats positive logarithmic values", () => {
    expect(formatYAxisTick(1500, "logarithmic")).toBe("1.5K");
  });

  it("formats linear values including zero", () => {
    expect(formatYAxisTick(0, "linear")).toBe("0");
    expect(formatYAxisTick(2_000_000, "linear")).toBe("2M");
  });
});

describe("getYAxisDomain", () => {
  const rows = [
    { time: "a", react: 100, vue: 0 },
    { time: "b", react: 1000, vue: null },
  ];

  it("returns auto domain for linear scale", () => {
    expect(getYAxisDomain(rows, "time", "linear")).toEqual(["auto", "auto"]);
  });

  it("falls back when there are no positive values", () => {
    expect(
      getYAxisDomain(
        [{ time: "a", react: 0, vue: null }],
        "time",
        "logarithmic",
      ),
    ).toEqual([1, 100]);
  });

  it("pads the min and max of positive values", () => {
    expect(getYAxisDomain(rows, "time", "logarithmic")).toEqual([90, 1100]);
  });

  it("never goes below 1", () => {
    expect(
      getYAxisDomain([{ time: "a", react: 1 }], "time", "logarithmic"),
    ).toEqual([1, 2]);
  });
});

describe("nullifyZeroValues", () => {
  it("replaces zero series values with null but keeps the x key", () => {
    expect(
      nullifyZeroValues([{ weekIndex: 0, react: 0, vue: 5 }], "weekIndex"),
    ).toEqual([{ weekIndex: 0, react: null, vue: 5 }]);
  });
});

describe("buildShareToXUrl", () => {
  it("encodes text and url", () => {
    expect(buildShareToXUrl("https://x.dev/?a=1&b=2")).toBe(
      "https://twitter.com/intent/tweet?text=Compare%20npm%20package%20download%20trends%20on%20Package%20Pulse&url=https%3A%2F%2Fx.dev%2F%3Fa%3D1%26b%3D2",
    );
  });
});

describe("formatXAxisTick", () => {
  it("formats week index in normalized mode", () => {
    expect(formatXAxisTick(3, true)).toBe("wk 3");
  });

  it("formats dates otherwise", () => {
    expect(formatXAxisTick(new Date(2024, 0, 5), false)).toBe("2024-01-05");
  });
});

describe("formatNormalizedLabel", () => {
  it("uses the first payload week index", () => {
    expect(formatNormalizedLabel([{ payload: { weekIndex: 7 } }])).toBe("wk 7");
  });

  it("handles missing payloads", () => {
    expect(formatNormalizedLabel(undefined)).toBe("wk undefined");
    expect(formatNormalizedLabel([{}])).toBe("wk undefined");
  });
});

describe("versions", () => {
  it("getLatestVersion returns undefined without versions", () => {
    expect(getLatestVersion()).toBeUndefined();
  });

  it("getLatestVersion returns the highest semver", () => {
    expect(getLatestVersion(VERSIONS)).toEqual(VERSIONS[0]);
  });

  it("formatVersion includes the formatted date", () => {
    expect(formatVersion({ version: "2.0.0", date: "2024-05-01" })).toBe(
      "2.0.0 (2024-05-01)",
    );
  });

  it("formatLatestVersion returns a dash for missing or empty versions", () => {
    expect(formatLatestVersion()).toBe("-");
    expect(formatLatestVersion([])).toBe("-");
  });

  it("formatLatestVersion formats the latest version", () => {
    expect(formatLatestVersion(VERSIONS)).toBe("1.10.0 (2024-03-01)");
  });
});
