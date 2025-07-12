"use client";
import { formatDate, startOfWeek } from "@/app/(home)/utils/date-utils";
import normalizeProjectName from "@/app/(home)/utils/normalizeProjectName";
import {
  useInitialChartScaleFromSearchParams,
  useInitialTimePeriodFromSearchParams,
  useUpdateSearchParamsChart,
} from "@/app/(home)/utils/search-params";
import {
  ChartContainer,
  ChartDotIndicator,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import chartScales, { ChartScale } from "@/lib/enums/ChartScale";
import LocalStorageKey from "@/lib/enums/LocalStorageKey";
import timePeriods, { TimePeriod } from "@/lib/enums/TimePeriod";
import useLocalStorage from "@/lib/hooks/useLocalStorage";
import assertUnreachable from "@/lib/utils/assertUnreachable";
import { cn } from "@/lib/utils/cn";
import { formatLargeNumber } from "@/lib/utils/formatters";
import sortByVersion from "@/lib/utils/sortByVersion";
import { isAfter, subMonths, subYears } from "date-fns";
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
import { ToggleGroup, ToggleGroupItem } from "./toggle-group";

export type ChartData = {
  time: string | Date;
} & Record<string, number | null>;

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
  const formattedDate = formatDate(version.date);
  return `${version.version} (${formattedDate})`;
};

type MultipleLineChartProps = {
  data: ChartData[];
  config: ChartConfig;
  chartKey: string;
};

function MultipleLineChart({ data, config, chartKey }: MultipleLineChartProps) {
  const initialTimePeriod = useInitialTimePeriodFromSearchParams();
  const initialChartScale = useInitialChartScaleFromSearchParams();

  const [timePeriod, setTimePeriod] = useState<TimePeriod>(initialTimePeriod);
  const [chartScale, setChartScale] = useState<ChartScale>(initialChartScale);
  const [chartData, setChartData] = useState<ChartData[]>(data);
  const [isPending, startTransition] = useTransition();
  const { isHiddenElement } = useLineChart(chartKey)();

  useUpdateSearchParamsChart(timePeriod, chartScale);

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

  const formatYAxisTick = useCallback(
    (value: number) => {
      if (chartScale === "logarithmic" && value <= 0) {
        return "0";
      }
      return formatLargeNumber(value);
    },
    [chartScale],
  );

  const getYAxisDomain = useCallback(() => {
    if (chartScale === "logarithmic") {
      const allValues = chartData.flatMap((item) =>
        Object.keys(item)
          .filter((key) => key !== "time")
          .map((key) => item[key])
          .filter(
            (value): value is number => typeof value === "number" && value > 0,
          ),
      );

      if (allValues.length === 0) {
        return [1, 100];
      }

      const minValue = Math.min(...allValues);
      const maxValue = Math.max(...allValues);

      const domain = [
        Math.max(1, Math.floor(minValue * 0.9)),
        Math.ceil(maxValue * 1.1),
      ];

      return domain;
    }

    return ["auto", "auto"];
  }, [chartData, chartScale]);

  const getTransformedData = useCallback(() => {
    if (chartScale === "logarithmic") {
      const transformedData = chartData.map((item) => {
        const newItem = { ...item } as ChartData;
        Object.keys(newItem).forEach((key) => {
          if (key !== "time" && newItem[key] === 0) {
            newItem[key] = null;
          }
        });
        return newItem;
      });

      return transformedData;
    }

    return chartData;
  }, [chartData, chartScale]);

  useLocalStorage(LocalStorageKey.TIME_PERIOD, timePeriod);
  useLocalStorage(LocalStorageKey.CHART_SCALE, chartScale);

  useEffect(() => {
    handleTimePeriodChange(timePeriod);
  }, [handleTimePeriodChange, timePeriod]);

  const yAxisScale = chartScale === "logarithmic" ? "log" : "linear";
  const yAxisDomain = getYAxisDomain();
  const transformedData = getTransformedData();

  return (
    <div
      className={cn(
        "size-full flex flex-col gap-8",
        data.length === 0 && "hidden",
      )}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
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

        <div className="flex items-center justify-between gap-2 sm:justify-start">
          <label className="text-nowrap text-sm font-medium">Scale</label>
          <ToggleGroup
            type="single"
            value={chartScale}
            onValueChange={(value) => {
              if (value) {
                setChartScale(value as ChartScale);
              }
            }}
            variant="outline"
            size="sm"
            className="w-full sm:w-auto"
          >
            {chartScales.map((scale) => (
              <ToggleGroupItem
                key={scale.value}
                value={scale.value}
                className="w-full sm:w-auto"
              >
                {scale.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
      </div>

      <div className={cn("relative mx-auto w-full h-full")}>
        <ChartContainer config={config} className="max-h-[450px] w-full">
          <LineChart
            accessibilityLayer
            data={transformedData}
            className="-ml-2 sm:ml-0"
            margin={{
              left: 4,
              right: 12,
            }}
          >
            <ChartLegend
              content={
                <ChartLegendContent chartKey={chartKey}>
                  <div className="flex items-center gap-1.5 text-xs text-foreground md:text-sm">
                    <Dash />
                    <span>Last release date</span>
                  </div>
                </ChartLegendContent>
              }
              layout="horizontal"
              className="max-w-[100vw] flex-wrap"
              verticalAlign="top"
            />
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="time"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => formatDate(value)}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={formatYAxisTick}
              tickCount={12}
              scale={yAxisScale}
              domain={yAxisDomain}
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
                            const weekStart = formatDate(
                              startOfWeek(version.date),
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
