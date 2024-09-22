"use client";

import { DATE_FORMAT } from "@/api/fetchNPMDownloads";
import normalizeProjectName from "@/app/(home)/utils/normalizeProjectName";
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import TimePeriod from "@/lib/enums/TimePeriod";
import assertUnreachable from "@/lib/utils/assertUnreachable";
import { cn } from "@/lib/utils/cn";
import { format, isAfter, subMonths, subYears } from "date-fns";
import { memo, useCallback, useEffect, useState, useTransition } from "react";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./select";

export type ChartData = {
  time: string | Date;
} & Record<string, number>;
type MultipleLineChartProps = {
  data: ChartData[];
  config: ChartConfig;
};
function MultipleLineChart({ data, config }: MultipleLineChartProps) {
  const [timePeriod, setTimePeriod] = useState<TimePeriod>(TimePeriod.ALL_TIME);
  const [chartData, setChartData] = useState<ChartData[]>(data);
  const [isPending, startTransition] = useTransition();

  const handleTimePeriodChange = useCallback(
    (value: TimePeriod) => {
      setTimePeriod(value);
      startTransition(() => {
        const newData = data.filter((item) => {
          const date = new Date(item.time);
          const today = new Date();
          switch (value) {
            case TimePeriod.ONE_MONTH:
              return isAfter(date, subMonths(today, 1));
            case TimePeriod.THREE_MONTH:
              return isAfter(date, subMonths(today, 3));
            case TimePeriod.SIX_MONTH:
              return isAfter(date, subMonths(today, 6));
            case TimePeriod.ONE_YEAR:
              return isAfter(date, subYears(today, 1));
            case TimePeriod.TWO_YEARS:
              return isAfter(date, subYears(today, 2));
            case TimePeriod.FIVE_YEARS:
              return isAfter(date, subYears(today, 5));
            case TimePeriod.ALL_TIME:
              return true;
            default:
              assertUnreachable(value, "Invalid time period");
          }
        });
        setChartData(newData);
      });
    },
    [data],
  );

  useEffect(() => {
    handleTimePeriodChange(timePeriod);
  }, [handleTimePeriodChange, timePeriod]);

  return (
    <div
      className={cn(
        "size-full flex flex-col gap-8",
        data.length === 0 && "hidden",
      )}
    >
      <div className="flex items-center gap-2">
        <label
          htmlFor="time-period-select"
          className="text-nowrap text-sm font-medium"
        >
          Time period
        </label>
        <Select
          value={timePeriod}
          onValueChange={(value) => setTimePeriod(value as TimePeriod)}
        >
          <SelectTrigger
            id="time-period-select"
            className="w-full md:w-[180px]"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={TimePeriod.ONE_MONTH}>1 month</SelectItem>
            <SelectItem value={TimePeriod.THREE_MONTH}>3 month</SelectItem>
            <SelectItem value={TimePeriod.SIX_MONTH}>6 month</SelectItem>
            <SelectItem value={TimePeriod.ONE_YEAR}>1 year</SelectItem>
            <SelectItem value={TimePeriod.TWO_YEARS}>2 years</SelectItem>
            <SelectItem value={TimePeriod.FIVE_YEARS}>5 years</SelectItem>
            <SelectItem value={TimePeriod.ALL_TIME}>All time</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className={cn("relative mx-auto w-full h-full")}>
        <ChartContainer config={config} className="max-h-[450px] w-full">
          <LineChart
            accessibilityLayer
            data={chartData}
            margin={{
              left: 28,
              right: 12,
            }}
          >
            <ChartLegend
              content={<ChartLegendContent />}
              layout="horizontal"
              verticalAlign="top"
            />
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="time"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => format(value, DATE_FORMAT)}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => value.toLocaleString()}
              tickCount={12}
            />
            <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
            {data &&
              data?.length > 0 &&
              data[0] &&
              Object.keys(data[0])
                .filter((key) => key !== "time")
                .map((key) => {
                  const normalizedKey = normalizeProjectName(key);
                  return (
                    <Line
                      key={normalizedKey}
                      dataKey={normalizedKey}
                      type="monotone"
                      stroke={`var(--color-${normalizedKey})`}
                      strokeWidth={2}
                      dot={false}
                    />
                  );
                })}
          </LineChart>
        </ChartContainer>
        {isPending && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/65">
            <div className="size-12 animate-spin rounded-full border-y-2 border-primary" />
          </div>
        )}
      </div>
    </div>
  );
}

export default memo(MultipleLineChart);
