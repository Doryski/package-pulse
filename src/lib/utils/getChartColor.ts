export const CHART_COLOR_COUNT = 10;

export const getChartColorVar = (index: number) =>
  `hsl(var(--chart-${(index % CHART_COLOR_COUNT) + 1}))`;
