"use client";

import { CartesianGrid, Line, LineChart, XAxis } from "recharts";

import { DATE_FORMAT } from "@/api/fetchNPMDownloads";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { format } from "date-fns";

export type ChartData = {
  time: string | Date;
} & Record<string, number>;
type MultipleLineChartProps = {
  data: ChartData[];
  config: ChartConfig;
};
export default function MultipleLineChart({
  data,
  config,
}: MultipleLineChartProps) {
  return (
    <ChartContainer config={config}>
      <LineChart
        accessibilityLayer
        data={data}
        margin={{
          left: 12,
          right: 12,
        }}
      >
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="time"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          tickFormatter={(value) => format(value, DATE_FORMAT)}
        />
        <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
        {data &&
          data?.length > 0 &&
          data[0] &&
          Object.keys(data[0])
            .filter((key) => key !== "time")
            .map((key) => (
              <Line
                key={key}
                dataKey={key}
                type="monotone"
                stroke={`var(--color-${key})`}
                strokeWidth={2}
                dot={false}
              />
            ))}
      </LineChart>
    </ChartContainer>
  );
}
