export type ChartScale = "linear" | "logarithmic";

export const chartScales: { value: ChartScale; label: string }[] = [
  { value: "linear", label: "Linear" },
  { value: "logarithmic", label: "Logarithmic" },
];

export default chartScales;
