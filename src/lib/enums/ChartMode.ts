export const chartModes = [
  { value: "absolute", label: "Calendar dates" },
  { value: "normalized", label: "Since first release" },
] as const;

export type ChartMode = (typeof chartModes)[number]["value"];

export const defaultChartMode: ChartMode = "absolute";

export default chartModes;
