"use client";

import { DATE_FORMAT } from "@/api/fetchNPMDownloads";
import normalizeProjectName from "@/app/(home)/utils/normalizeProjectName";
import {
  ChartContainer,
  ChartDotIndicator,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import LocalStorageKey from "@/lib/enums/LocalStorageKey";
import timePeriods, { TimePeriod } from "@/lib/enums/TimePeriod";
import useLocalStorage from "@/lib/hooks/useLocalStorage";
import assertUnreachable from "@/lib/utils/assertUnreachable";
import { cn } from "@/lib/utils/cn";
import sortByVersion from "@/lib/utils/sortByVersion";
import { format, isAfter, startOfWeek, subMonths, subYears } from "date-fns";
import {
  Fragment,
  memo,
  useCallback,
  useEffect,
  useState,
  useTransition,
} from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts";
import { create } from "zustand";
import { devtools } from "zustand/middleware";
import Dash from "./dash";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./select";
import { Separator } from "./separator";

export type ChartData = {
  time: string | Date;
} & Record<string, number>;

export type VersionData = {
  version: string;
  date: string;
};

export type ChartConfig = {
  [k in string]: {
    label?: React.ReactNode;
    icon?: React.ComponentType;
    versions?: VersionData[];
  } & (
    | { color?: string; theme?: never }
    | { color?: never; theme: Record<"light" | "dark", string> }
  );
};

type LineChartStore = {
  config: ChartConfig;
  hiddenElements: Set<string>;
  setConfig: (config: ChartConfig) => void;
  toggleElement: (key: string) => void;
  isHiddenElement: (key: string) => boolean;
};

const createLineChartStore = (key: string) => {
  const storeName = `line-chart-${key}`;
  return create<LineChartStore>()(
    devtools(
      (set, get) => ({
        config: {},
        hiddenElements: new Set(),
        setConfig: (config) => set({ config }),
        toggleElement: (key) =>
          set((state) => {
            const nextHiddenKeys = new Set(state.hiddenElements);
            if (nextHiddenKeys.has(key)) {
              nextHiddenKeys.delete(key);
            } else {
              nextHiddenKeys.add(key);
            }
            return { hiddenElements: nextHiddenKeys };
          }),
        isHiddenElement: (key) => get().hiddenElements.has(key),
      }),
      { name: storeName },
    ),
  );
};

const storeCache = new Map<string, ReturnType<typeof createLineChartStore>>();

export const useLineChart = (key: string) => {
  if (!storeCache.has(key)) {
    storeCache.set(key, createLineChartStore(key));
  }
  return storeCache.get(key)!;
};

const getLatestVersion = (versions?: VersionData[]) => {
  if (!versions) return;
  return sortByVersion(versions).at(-1);
};

const formatVersion = (version: VersionData) => {
  const formattedDate = format(version.date, DATE_FORMAT);
  return `${version.version} (${formattedDate})`;
};

const formatLargeNumber = (value: unknown): string => {
  let numericValue: number;
  if (typeof value !== "number") {
    numericValue = Number(value);
  } else {
    numericValue = value;
  }

  if (numericValue > 1_000_000_000) {
    return `${(numericValue / 1_000_000_000).toFixed(1)}B`;
  }

  if (numericValue >= 1_000_000) {
    return `${(numericValue / 1_000_000).toFixed(1)}M`;
  }
  if (numericValue >= 1_000) {
    return `${(numericValue / 1_000).toFixed(1)}K`;
  }
  return numericValue.toLocaleString();
};
type MultipleLineChartProps = {
  data: ChartData[];
  config: ChartConfig;
  chartKey: string;
};

function MultipleLineChart({ data, config, chartKey }: MultipleLineChartProps) {
  const [timePeriod, setTimePeriod] = useState<TimePeriod>("all-time");
  const [chartData, setChartData] = useState<ChartData[]>(data);
  const [isPending, startTransition] = useTransition();
  const { isHiddenElement } = useLineChart(chartKey)();

  const handleTimePeriodChange = useCallback(
    (value: TimePeriod) => {
      setTimePeriod(value);
      startTransition(() => {
        const newData = data.filter((item) => {
          const date = new Date(item.time);
          const today = new Date();
          switch (value) {
            case "months-1":
              return isAfter(date, subMonths(today, 1));
            case "months-3":
              return isAfter(date, subMonths(today, 3));
            case "months-6":
              return isAfter(date, subMonths(today, 6));
            case "years-1":
              return isAfter(date, subYears(today, 1));
            case "years-2":
              return isAfter(date, subYears(today, 2));
            case "years-5":
              return isAfter(date, subYears(today, 5));
            case "all-time":
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

  useLocalStorage(LocalStorageKey.TIME_PERIOD, timePeriod);
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
            {timePeriods.map((timePeriod) => (
              <SelectItem key={timePeriod.value} value={timePeriod.value}>
                {timePeriod.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className={cn("relative mx-auto w-full h-full")}>
        <ChartContainer config={config} className="max-h-[450px] w-full">
          <LineChart
            accessibilityLayer
            data={chartData}
            margin={{
              left: 4,
              right: 12,
            }}
          >
            <ChartLegend
              content={
                <ChartLegendContent chartKey={chartKey}>
                  <div className="flex items-center gap-1.5 text-sm text-foreground">
                    <Dash />
                    <span>Last release date</span>
                  </div>
                </ChartLegendContent>
              }
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
              tickFormatter={(value) => formatLargeNumber(value)}
              tickCount={12}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent chartKey={chartKey}>
                  <Separator />
                  <div className="flex items-center gap-1.5 text-sm text-foreground">
                    <span>Last releases</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    {Object.keys(config).map((key) => {
                      const latestVersion = getLatestVersion(
                        config[key]?.versions,
                      );
                      const displayName = config[key]?.label || key;
                      return (
                        <div
                          key={key}
                          className="flex w-full items-center gap-2"
                        >
                          <ChartDotIndicator
                            indicator="dashed"
                            nestLabel={false}
                            indicatorColor={`var(--color-${key})`}
                          />
                          <div className="flex w-full items-center justify-between gap-1">
                            <span className="text-xs text-muted-foreground">
                              {displayName}
                            </span>
                            <span className="text-right text-xs text-foreground">
                              {latestVersion
                                ? formatVersion(latestVersion)
                                : "-"}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ChartTooltipContent>
              }
            />
            {data &&
              data?.length > 0 &&
              data[0] &&
              Object.keys(data[0])
                .filter((key) => key !== "time")
                .map((key) => {
                  const normalizedKey = normalizeProjectName(key);
                  const projectConfig = config[normalizedKey];

                  return (
                    <Fragment key={normalizedKey}>
                      <Line
                        dataKey={key}
                        type="monotone"
                        stroke={`var(--color-${normalizedKey})`}
                        strokeWidth={2}
                        dot={false}
                        hide={isHiddenElement(normalizedKey)}
                      />
                      {!isHiddenElement(normalizedKey) &&
                        projectConfig?.versions &&
                        sortByVersion(projectConfig.versions)
                          .slice(-1)
                          .map((version) => {
                            const weekStart = format(
                              startOfWeek(version.date),
                              DATE_FORMAT,
                            );

                            return (
                              <ReferenceLine
                                key={`${normalizedKey}-${version.version}`}
                                x={weekStart}
                                stroke={`var(--color-${normalizedKey})`}
                                strokeDasharray="3 3"
                              />
                            );
                          })}
                    </Fragment>
                  );
                })}
          </LineChart>
        </ChartContainer>
        {isPending && (
          <div
            role="status"
            className="absolute inset-0 flex items-center justify-center bg-background/65"
          >
            <div className="size-12 animate-spin rounded-full border-y-2 border-primary" />
          </div>
        )}
      </div>
    </div>
  );
}

export default memo(MultipleLineChart);
