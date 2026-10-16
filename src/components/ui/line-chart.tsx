"use client";
import { XIcon } from "@/components/icons/brand-icons";
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
import * as z from "zod/mini";
import timePeriods, { TimePeriod } from "@/lib/enums/TimePeriod";
import useLocalStorage from "@/lib/hooks/useLocalStorage";
import { cn } from "@/lib/utils/cn";
import { exportCsv } from "@/lib/utils/exportUtils";
import { copyAsImage, downloadAsImage } from "@/lib/utils/imageExport";
import { ChevronDown, Copy, Download, Link2, Table } from "lucide-react";
import {
  Fragment,
  memo,
  type ReactNode,
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
import Dash from "./dash";
import { useHiddenElements } from "./line-chart-store";
import {
  buildShareToXUrl,
  ChartConfig,
  ChartData,
  ChartRow,
  filterByTimePeriod,
  findReleaseRowKey,
  formatLatestVersion,
  formatNormalizedLabel,
  formatXAxisTick,
  formatYAxisTick,
  getSeriesKeys,
  getYAxisDomain,
  NormalizedChartData,
  nullifyZeroValues,
  type VersionData,
} from "./line-chart-utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./select";
import { Separator } from "./separator";
import { ToggleGroup, ToggleGroupItem } from "./toggle-group";

export type {
  ChartConfig,
  ChartData,
  NormalizedChartData,
  VersionData,
} from "./line-chart-utils";

const chartModeSchema = z.custom<ChartMode>((value) =>
  chartModes.some((mode) => mode.value === value),
);

const CHART_MARGIN = { left: 4, right: 12 } as const;

const toNormalizedLabel = (
  _value: unknown,
  payload: Parameters<typeof formatNormalizedLabel>[0],
) => formatNormalizedLabel(payload);

const toCalendarLabel = (value: ReactNode) => value;

const formatCalendarTick = (value: string | number | Date) =>
  formatXAxisTick(value, false);

const formatNormalizedTick = (value: string | number | Date) =>
  formatXAxisTick(value, true);

type LastReleasesListProps = {
  config: ChartConfig;
};

export function LastReleasesList({ config }: LastReleasesListProps) {
  return (
    <>
      <Separator />
      <div className="flex items-center gap-1.5 text-sm text-foreground">
        <span>Last releases</span>
      </div>
      <div className="flex flex-col gap-1">
        {Object.keys(config).map((key) => {
          const displayName = config[key]?.label || key;
          return (
            <div key={key} className="flex w-full items-center gap-2">
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
                  {formatLatestVersion(config[key]?.latestRelease)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

type MultipleLineChartProps = {
  data: ChartData[];
  normalizedData: NormalizedChartData[];
  config: ChartConfig;
  chartKey: string;
};

type LatestReleaseLineProps = {
  normalizedKey: string;
  release?: VersionData | null;
  rows: ChartRow[];
  xKey: string;
};

const LatestReleaseLine = ({
  normalizedKey,
  release,
  rows,
  xKey,
}: LatestReleaseLineProps) => {
  if (!release) return null;
  const x = findReleaseRowKey(rows, xKey, release.date);
  if (!x) return null;
  return (
    <ReferenceLine
      x={x}
      stroke={`var(--color-${normalizedKey})`}
      strokeDasharray="3 3"
    />
  );
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
  const hiddenElements = useHiddenElements(chartKey);
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

  const [now] = useState(() => new Date());

  const chartData = useMemo<ChartRow[]>(() => {
    if (isNormalized) {
      return normalizedData;
    }
    return filterByTimePeriod(data, timePeriod, now);
  }, [data, normalizedData, timePeriod, isNormalized, now]);

  const seriesKeys = useMemo(
    () => getSeriesKeys(chartData, xKey),
    [chartData, xKey],
  );

  const sortLegendBySeries = useCallback(
    (item: LegendPayload) => seriesKeys.indexOf(`${item.dataKey}`),
    [seriesKeys],
  );

  const handleFormatYAxisTick = useCallback(
    (value: number) => formatYAxisTick(value, chartScale),
    [chartScale],
  );

  const yAxisDomain = useMemo(
    () => getYAxisDomain(chartData, xKey, chartScale),
    [chartData, chartScale, xKey],
  );

  const transformedData = useMemo(() => {
    if (chartScale === "logarithmic") {
      return nullifyZeroValues(chartData, xKey);
    }
    return chartData;
  }, [chartData, chartScale, xKey]);

  useLocalStorage(LocalStorageKey.TIME_PERIOD, timePeriod);
  useLocalStorage(LocalStorageKey.CHART_SCALE, chartScale);
  useLocalStorage(LocalStorageKey.CHART_MODE, chartMode);

  const yAxisScale = chartScale === "logarithmic" ? "log" : "linear";
  const xAxisTickFormatter = isNormalized
    ? formatNormalizedTick
    : formatCalendarTick;
  const tooltipLabelFormatter = isNormalized
    ? toNormalizedLabel
    : toCalendarLabel;

  const handleTimePeriodSelect = useCallback(
    (value: string) => handleTimePeriodChange(value as TimePeriod),
    [handleTimePeriodChange],
  );

  const handleChartScaleSelect = useCallback((value: string) => {
    if (!value) return;
    setChartScale(value as ChartScale);
  }, []);

  const handleChartModeSelect = useCallback(
    (value: string) => {
      if (!value) return;
      handleChartModeChange(value as ChartMode);
    },
    [handleChartModeChange],
  );

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
    void exportCsv(`package-pulse-chart-${Date.now()}`, chartData);
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
    window.open(
      buildShareToXUrl(window.location.href),
      "_blank",
      "noopener,noreferrer",
    );
  }, []);

  return (
    <div
      className={cn(
        "flex size-full flex-col gap-8",
        data.length === 0 && "hidden",
      )}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <label
            htmlFor="time-period-select"
            className="text-sm font-medium text-nowrap"
          >
            Time period
          </label>
          <Select
            value={timePeriod}
            onValueChange={handleTimePeriodSelect}
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

        <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
          <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-2">
            <label className="text-sm font-medium text-nowrap">Scale</label>
            <ToggleGroup
              type="single"
              aria-label="Scale"
              value={chartScale}
              onValueChange={handleChartScaleSelect}
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

          <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-2">
            <label className="text-sm font-medium text-nowrap">Timeline</label>
            <ToggleGroup
              type="single"
              aria-label="Timeline"
              value={chartMode}
              onValueChange={handleChartModeSelect}
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
                <Download className="size-4" />
              </Button>
            </SimpleTooltip>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="px-2">
                  <span className="text-sm">Share</span>
                  <ChevronDown className="ml-1 size-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={handleCopyImage}
                  className="flex items-center gap-2"
                >
                  <Copy className="size-4" />
                  <span>Copy image</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={handleExportCsv}
                  className="flex items-center gap-2"
                >
                  <Table className="size-4" />
                  <span>Export CSV</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={handleCopyLink}
                  className="flex items-center gap-2"
                >
                  <Link2 className="size-4" />
                  <span>Copy link</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={handleShareToX}
                  className="flex items-center gap-2"
                >
                  <XIcon className="size-4" />
                  <span>Share to X</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      <div ref={chartRef} className="relative mx-auto size-full">
        <ChartContainer
          config={config}
          className="aspect-square max-h-[450px] w-full sm:aspect-video"
        >
          <LineChart
            accessibilityLayer
            data={transformedData}
            className="-ml-2 sm:ml-0"
            margin={CHART_MARGIN}
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
              tickFormatter={xAxisTickFormatter}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={handleFormatYAxisTick}
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
                  labelFormatter={tooltipLabelFormatter}
                >
                  <LastReleasesList config={config} />
                </ChartTooltipContent>
              }
            />
            {seriesKeys.map((key) => {
              const normalizedKey = normalizeProjectName(key);
              const projectConfig = config[normalizedKey];
              const isHidden = hiddenElements.has(normalizedKey);

              return (
                <Fragment key={normalizedKey}>
                  <Line
                    dataKey={key}
                    type="monotone"
                    stroke={`var(--color-${normalizedKey})`}
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                    hide={isHidden}
                  />
                  {!isNormalized && !isHidden && (
                    <LatestReleaseLine
                      normalizedKey={normalizedKey}
                      release={projectConfig?.latestRelease}
                      rows={chartData}
                      xKey={xKey}
                    />
                  )}
                </Fragment>
              );
            })}
          </LineChart>
        </ChartContainer>
        {isPending && (
          <div
            role="status"
            aria-label="Updating chart"
            data-testid="main-chart-loader"
            className="absolute inset-0 flex items-center justify-center bg-background/65"
          >
            <div className="size-12 animate-spin rounded-full border-y-2 border-primary motion-reduce:animate-none" />
          </div>
        )}
      </div>
    </div>
  );
}

export default memo(MultipleLineChart);
