"use client";
import { formatDate, startOfWeek } from "@/app/(home)/utils/date-utils";
import normalizeProjectName from "@/app/(home)/utils/normalizeProjectName";
import {
  useInitialChartModeFromSearchParams,
  useInitialChartScaleFromSearchParams,
  useInitialTimePeriodFromSearchParams,
  useUpdateSearchParamsChart,
} from "@/app/(home)/utils/search-params";
import { SimpleTooltip } from "@/components/simple-tooltip";
import { Button } from "@/components/ui/button";
import {
  ChartContainer,
  ChartDotIndicator,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import chartModes, { ChartMode } from "@/lib/enums/ChartMode";
import chartScales, { ChartScale } from "@/lib/enums/ChartScale";
import LocalStorageKey from "@/lib/enums/LocalStorageKey";
import getLocalStorageValue from "@/lib/utils/getLocalStorageValue";
import { useSearchParams } from "next/navigation";
import { z } from "zod";
import timePeriods, { TimePeriod } from "@/lib/enums/TimePeriod";
import useLocalStorage from "@/lib/hooks/useLocalStorage";
import assertUnreachable from "@/lib/utils/assertUnreachable";
import { cn } from "@/lib/utils/cn";
import { exportCsv } from "@/lib/utils/exportUtils";
import { formatLargeNumber } from "@/lib/utils/formatters";
import { copyAsImage, downloadAsImage } from "@/lib/utils/imageExport";
import sortByVersion from "@/lib/utils/sortByVersion";
import {
  ChevronDownIcon,
  CopyIcon,
  DownloadIcon,
  Link2Icon,
  TableIcon,
  TwitterLogoIcon,
} from "@radix-ui/react-icons";
import { isAfter, subMonths, subYears } from "date-fns";
import {
  Fragment,
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import {
  CartesianGrid,
  type LegendPayload,
  Line,
  LineChart,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";
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

export type NormalizedChartData = {
  weekIndex: number;
} & Record<string, number | null>;

type ChartRow = Record<string, number | string | Date | null>;

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

const chartModeSchema = z.custom<ChartMode>((value) =>
  chartModes.some((mode) => mode.value === value),
);

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
  normalizedData: NormalizedChartData[];
  config: ChartConfig;
  chartKey: string;
};

function MultipleLineChart({
  data,
  normalizedData,
  config,
  chartKey,
}: MultipleLineChartProps) {
  const initialTimePeriod = useInitialTimePeriodFromSearchParams();
  const initialChartScale = useInitialChartScaleFromSearchParams();
  const initialChartMode = useInitialChartModeFromSearchParams();
  const hasModeParam = useSearchParams().has("mode");

  const [timePeriod, setTimePeriod] = useState<TimePeriod>(initialTimePeriod);
  const [chartScale, setChartScale] = useState<ChartScale>(initialChartScale);
  const [chartMode, setChartMode] = useState<ChartMode>(initialChartMode);

  const hasRestoredMode = useRef(false);

  useEffect(() => {
    if (hasModeParam || hasRestoredMode.current) return;
    hasRestoredMode.current = true;
    const storedMode = getLocalStorageValue(
      LocalStorageKey.CHART_MODE,
      chartModeSchema,
    );
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (storedMode) setChartMode(storedMode);
  }, [hasModeParam]);

  const [isPending, startTransition] = useTransition();
  const { isHiddenElement } = useLineChart(chartKey)();
  const chartRef = useRef<HTMLDivElement>(null);

  useUpdateSearchParamsChart(timePeriod, chartScale, chartMode);

  const isNormalized = chartMode === "normalized";
  const xKey = isNormalized ? "weekIndex" : "time";

  const handleTimePeriodChange = useCallback((value: TimePeriod) => {
    startTransition(() => {
      setTimePeriod(value);
    });
  }, []);

  const handleChartModeChange = useCallback((value: ChartMode) => {
    startTransition(() => {
      setChartMode(value);
    });
  }, []);

  const chartData = useMemo<ChartRow[]>(() => {
    if (isNormalized) {
      return normalizedData;
    }

    const today = new Date();
    return data.filter((item) => {
      const date = new Date(item.time);
      switch (timePeriod) {
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
          return assertUnreachable(timePeriod, "Invalid time period");
      }
    });
  }, [data, normalizedData, timePeriod, isNormalized]);

  const seriesKeys = useMemo(() => {
    const first = chartData[0];
    if (!first) return [];
    return Object.keys(first).filter((key) => key !== xKey);
  }, [chartData, xKey]);

  const sortLegendBySeries = useCallback(
    (item: LegendPayload) => seriesKeys.indexOf(`${item.dataKey}`),
    [seriesKeys],
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

  const yAxisDomain = useMemo(() => {
    if (chartScale === "logarithmic") {
      const allValues = chartData.flatMap((item) =>
        Object.keys(item)
          .filter((key) => key !== xKey)
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

      return [
        Math.max(1, Math.floor(minValue * 0.9)),
        Math.ceil(maxValue * 1.1),
      ];
    }

    return ["auto", "auto"];
  }, [chartData, chartScale, xKey]);

  const transformedData = useMemo(() => {
    if (chartScale === "logarithmic") {
      return chartData.map((item) => {
        const newItem = { ...item };
        Object.keys(newItem).forEach((key) => {
          if (key !== xKey && newItem[key] === 0) {
            newItem[key] = null;
          }
        });
        return newItem;
      });
    }

    return chartData;
  }, [chartData, chartScale, xKey]);

  useLocalStorage(LocalStorageKey.TIME_PERIOD, timePeriod);
  useLocalStorage(LocalStorageKey.CHART_SCALE, chartScale);
  useLocalStorage(LocalStorageKey.CHART_MODE, chartMode);

  const yAxisScale = chartScale === "logarithmic" ? "log" : "linear";

  const handleDownloadImage = useCallback(async () => {
    if (!chartRef.current) return;
    await downloadAsImage(
      chartRef.current,
      `package-pulse-chart-${Date.now()}`,
      "Chart",
    );
  }, []);

  const handleCopyImage = useCallback(async () => {
    if (!chartRef.current) return;
    await copyAsImage(chartRef.current, "Chart");
  }, []);

  const handleExportCsv = useCallback(() => {
    exportCsv(`package-pulse-chart-${Date.now()}`, chartData);
  }, [chartData]);

  const handleCopyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Link copied to clipboard");
    } catch (error) {
      console.error("Error copying link:", error);
      toast.error("Failed to copy link");
    }
  }, []);

  const handleShareToX = useCallback(() => {
    const text = "Compare npm package download trends on Package Pulse";
    const intentUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
      text,
    )}&url=${encodeURIComponent(window.location.href)}`;
    window.open(intentUrl, "_blank", "noopener,noreferrer");
  }, []);

  return (
    <div
      className={cn(
        "flex size-full flex-col gap-8",
        data.length === 0 && "hidden",
      )}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <label
            htmlFor="time-period-select"
            className="text-sm font-medium text-nowrap"
          >
            Time period
          </label>
          <Select
            value={timePeriod}
            onValueChange={(value) =>
              handleTimePeriodChange(value as TimePeriod)
            }
            disabled={isNormalized}
          >
            <SimpleTooltip
              content="Time period is unavailable in “Since first release” mode"
              open={isNormalized ? undefined : false}
            >
              <SelectTrigger id="time-period-select" className="w-full md:w-45">
                <SelectValue />
              </SelectTrigger>
            </SimpleTooltip>
            <SelectContent>
              {timePeriods.map((timePeriod) => (
                <SelectItem key={timePeriod.value} value={timePeriod.value}>
                  {timePeriod.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-4">
          <div className="flex items-center justify-between gap-2 sm:justify-start">
            <label className="text-sm font-medium text-nowrap">Scale</label>
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

          <div className="flex items-center justify-between gap-2 sm:justify-start">
            <label className="text-sm font-medium text-nowrap">Timeline</label>
            <ToggleGroup
              type="single"
              value={chartMode}
              onValueChange={(value) => {
                if (value) {
                  handleChartModeChange(value as ChartMode);
                }
              }}
              variant="outline"
              size="sm"
              className="w-full sm:w-auto"
            >
              {chartModes.map((mode) => (
                <ToggleGroupItem
                  key={mode.value}
                  value={mode.value}
                  className="w-full sm:w-auto"
                >
                  {mode.label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>

          <div className="flex items-center justify-end gap-1">
            <SimpleTooltip content="Download as PNG">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDownloadImage}
                aria-label="Download chart as PNG"
              >
                <DownloadIcon className="size-4" />
              </Button>
            </SimpleTooltip>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="px-2">
                  <span className="text-sm">Share</span>
                  <ChevronDownIcon className="ml-1 size-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={handleCopyImage}
                  className="flex items-center gap-2"
                >
                  <CopyIcon className="size-4" />
                  <span>Copy image</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={handleExportCsv}
                  className="flex items-center gap-2"
                >
                  <TableIcon className="size-4" />
                  <span>Export CSV</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={handleCopyLink}
                  className="flex items-center gap-2"
                >
                  <Link2Icon className="size-4" />
                  <span>Copy link</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={handleShareToX}
                  className="flex items-center gap-2"
                >
                  <TwitterLogoIcon className="size-4" />
                  <span>Share to X</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      <div ref={chartRef} className={cn("relative mx-auto size-full")}>
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
                <ChartLegendContent
                  chartKey={chartKey}
                  className="max-w-[100vw] flex-wrap"
                >
                  {!isNormalized && (
                    <div className="flex items-center gap-1.5 text-xs text-foreground md:text-sm">
                      <Dash />
                      <span>Last release date</span>
                    </div>
                  )}
                </ChartLegendContent>
              }
              layout="horizontal"
              verticalAlign="top"
              itemSorter={sortLegendBySeries}
            />
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey={xKey}
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) =>
                isNormalized ? `wk ${value}` : formatDate(value)
              }
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
              includeHidden
              content={
                <ChartTooltipContent
                  chartKey={chartKey}
                  labelFormatter={(value, payload) => {
                    if (!isNormalized) return value;
                    const [first] = payload ?? [];
                    const weekIndex = first?.payload?.weekIndex;
                    return `wk ${weekIndex}`;
                  }}
                >
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
            {seriesKeys.map((key) => {
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
                  {!isNormalized &&
                    !isHiddenElement(normalizedKey) &&
                    projectConfig?.versions &&
                    sortByVersion(projectConfig.versions)
                      .slice(-1)
                      .map((version) => {
                        const weekStart = formatDate(startOfWeek(version.date));

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
