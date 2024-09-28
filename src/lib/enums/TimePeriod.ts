const timePeriods = [
  {
    value: "months-1",
    label: "1 month",
  },
  {
    value: "months-3",
    label: "3 months",
  },
  {
    value: "months-6",
    label: "6 months",
  },
  {
    value: "years-1",
    label: "1 year",
  },
  {
    value: "years-2",
    label: "2 years",
  },
  {
    value: "years-5",
    label: "5 years",
  },
  {
    value: "all-time",
    label: "All time",
  },
] as const satisfies { value: string; label: string }[];

export type TimePeriod = (typeof timePeriods)[number]["value"];
export default timePeriods;
