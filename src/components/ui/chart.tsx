"use client";
import normalizeProjectName from "@/app/(home)/utils/normalizeProjectName";
import { cn } from "@/lib/utils/cn";
import * as React from "react";
import * as RechartsPrimitive from "recharts";
import type { TooltipValueType } from "recharts";
import Dash from "./dash";
import {
  useHiddenElements,
  useIsHiddenElement,
  useToggleElement,
} from "./line-chart-store";
import type { ChartConfig } from "./line-chart-utils";

// Format: { THEME_NAME: CSS_SELECTOR }
const THEMES = { light: "", dark: ".dark" } as const;

const INITIAL_DIMENSION = { width: 320, height: 200 } as const;

type TooltipNameType = number | string;

const ChartContext = React.createContext<ChartConfig | null>(null);

const useChartConfig = () => {
  const config = React.use(ChartContext);
  if (!config) {
    throw new Error(
      "Chart components must be used within a <ChartContainer />",
    );
  }
  return config;
};

const ChartContainer = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> & {
    config: ChartConfig;
    children: React.ComponentProps<
      typeof RechartsPrimitive.ResponsiveContainer
    >["children"];
  }
>(({ id, className, children, config, ...props }, ref) => {
  const uniqueId = React.useId();
  const chartId = `chart-${id || uniqueId.replace(/:/g, "")}`;

  return (
    <ChartContext value={config}>
      <div
        data-chart={chartId}
        ref={ref}
        className={cn(
          "flex aspect-video justify-center text-xs [&_.recharts-cartesian-axis-tick-label_text]:fill-muted-foreground [&_.recharts-cartesian-grid_line[stroke='#ccc']]:stroke-border/50 [&_.recharts-curve.recharts-tooltip-cursor]:stroke-border [&_.recharts-dot[stroke='#fff']]:stroke-transparent [&_.recharts-layer]:outline-hidden [&_.recharts-polar-grid_[stroke='#ccc']]:stroke-border [&_.recharts-radial-bar-background-sector]:fill-muted [&_.recharts-rectangle.recharts-tooltip-cursor]:fill-muted [&_.recharts-reference-line_[stroke='#ccc']]:stroke-border [&_.recharts-sector]:outline-hidden [&_.recharts-sector[stroke='#fff']]:stroke-transparent [&_.recharts-surface]:outline-hidden",
          className,
        )}
        {...props}
      >
        <ChartStyle id={chartId} config={config} />
        <RechartsPrimitive.ResponsiveContainer
          initialDimension={INITIAL_DIMENSION}
        >
          {children}
        </RechartsPrimitive.ResponsiveContainer>
      </div>
    </ChartContext>
  );
});
ChartContainer.displayName = "Chart";

const ChartStyle = ({ id, config }: { id: string; config: ChartConfig }) => {
  const colorConfig = Object.entries(config).filter(
    ([_, itemConfig]) => itemConfig.theme || itemConfig.color,
  );

  if (!colorConfig.length) {
    return null;
  }

  return (
    <style
      dangerouslySetInnerHTML={{
        __html: Object.entries(THEMES)
          .map(
            ([theme, prefix]) => `
${prefix} [data-chart=${id}] {
${colorConfig
  .map(([key, itemConfig]) => {
    const color =
      itemConfig.theme?.[theme as keyof typeof itemConfig.theme] ||
      itemConfig.color;
    return color ? `  --color-${key}: ${color};` : null;
  })
  .join("\n")}
}
`,
          )
          .join("\n"),
      }}
    />
  );
};

const ChartTooltip = RechartsPrimitive.Tooltip;

const ChartTooltipContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<typeof RechartsPrimitive.Tooltip> &
    React.ComponentProps<"div"> & {
      hideLabel?: boolean;
      hideIndicator?: boolean;
      indicator?: "line" | "dot" | "dashed";
      nameKey?: string;
      labelKey?: string;
      chartKey: string;
      children?: React.ReactNode;
    } & Omit<
      RechartsPrimitive.DefaultTooltipContentProps<
        TooltipValueType,
        TooltipNameType
      >,
      "accessibilityLayer"
    >
>(
  (
    {
      active,
      payload,
      className,
      indicator = "dot",
      hideLabel = false,
      hideIndicator = false,
      label,
      labelFormatter,
      labelClassName,
      formatter,
      color,
      nameKey,
      labelKey,
      chartKey,
      children,
    },
    ref,
  ) => {
    const config = useChartConfig();
    const hiddenElements = useHiddenElements(chartKey);

    const getTooltipLabel = () => {
      if (hideLabel || !payload?.length) {
        return null;
      }

      const [item] = payload;
      const key = `${labelKey || item?.dataKey || item?.name || "value"}`;
      const itemConfig = getPayloadConfigFromPayload(config, item, key);
      const value =
        !labelKey && typeof label === "string"
          ? config[label as keyof typeof config]?.label || label
          : itemConfig?.label;

      if (labelFormatter) {
        return (
          <div className={cn("font-medium", labelClassName)}>
            {labelFormatter(value, payload)}
          </div>
        );
      }

      if (!value) {
        return null;
      }

      return <div className={cn("font-medium", labelClassName)}>{value}</div>;
    };

    if (!active || !payload?.length) {
      return null;
    }

    const nestLabel = payload.length === 1 && indicator !== "dot";
    const tooltipLabel = getTooltipLabel();

    return (
      <div
        ref={ref}
        className={cn(
          "grid min-w-32 items-start gap-1.5 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl",
          className,
        )}
      >
        {!nestLabel ? tooltipLabel : null}
        <div className="grid gap-1.5">
          {payload.map((item, index) => {
            const key = `${nameKey || item.name || item.dataKey || "value"}`;
            const itemConfig = getPayloadConfigFromPayload(config, item, key);
            const indicatorColor = color || item.payload?.fill || item.color;
            const isHidden = hiddenElements.has(normalizeProjectName(key));

            return (
              <div
                key={`${item.dataKey ?? index}`}
                className={cn(
                  "flex w-full flex-wrap items-stretch gap-2 rounded text-left [&>svg]:size-2.5 [&>svg]:text-muted-foreground",
                  indicator === "dot" && "items-center",
                  isHidden && "opacity-50",
                )}
              >
                {formatter && item?.value !== undefined && item.name ? (
                  formatter(item.value, item.name, item, index, item.payload)
                ) : (
                  <>
                    {itemConfig?.icon ? (
                      <itemConfig.icon />
                    ) : (
                      !hideIndicator && (
                        <ChartDotIndicator
                          indicator={indicator}
                          nestLabel={nestLabel}
                          indicatorColor={indicatorColor}
                        />
                      )
                    )}
                    <div
                      className={cn(
                        "flex flex-1 justify-between gap-1 leading-none",
                        nestLabel ? "items-end" : "items-center",
                        isHidden && "line-through",
                      )}
                    >
                      <div className="grid gap-1.5">
                        {nestLabel ? tooltipLabel : null}
                        <span className="text-muted-foreground">
                          {itemConfig?.label || item.name}
                        </span>
                      </div>
                      {item.value != null && (
                        <span className="font-mono font-medium text-foreground tabular-nums">
                          {formatTooltipValue(item.value)}
                        </span>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
          {children}
        </div>
      </div>
    );
  },
);
ChartTooltipContent.displayName = "ChartTooltip";

const ChartLegend = RechartsPrimitive.Legend;

const ChartLegendContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> &
    Pick<
      RechartsPrimitive.DefaultLegendContentProps,
      "payload" | "verticalAlign"
    > & {
      hideIcon?: boolean;
      nameKey?: string;
      chartKey: string;
      children?: React.ReactNode;
    }
>(
  (
    {
      className,
      hideIcon = false,
      payload,
      verticalAlign = "bottom",
      nameKey,
      chartKey,
      children,
    },
    ref,
  ) => {
    const config = useChartConfig();

    if (!payload?.length) {
      return null;
    }

    return (
      <div
        ref={ref}
        className={cn(
          "flex items-center justify-center gap-4",
          verticalAlign === "top" ? "pb-3" : "pt-3",
          className,
        )}
      >
        {payload.map((item, index) => {
          const key = `${nameKey || item.dataKey || "value"}`;
          const itemConfig = getPayloadConfigFromPayload(config, item, key);

          return (
            <ChartLegendItem
              key={item.value ?? index}
              chartKey={chartKey}
              seriesKey={normalizeProjectName(key)}
              label={itemConfig?.label || item.value}
              color={item.color}
              icon={hideIcon ? undefined : itemConfig?.icon}
            />
          );
        })}
        {children}
      </div>
    );
  },
);
ChartLegendContent.displayName = "ChartLegend";

type ChartLegendItemProps = {
  chartKey: string;
  seriesKey: string;
  label: React.ReactNode;
  color?: string;
  icon?: React.ComponentType;
};

const ChartLegendItem = React.memo(
  ({ chartKey, seriesKey, label, color, icon: Icon }: ChartLegendItemProps) => {
    const isHidden = useIsHiddenElement(chartKey, seriesKey);
    const toggleElement = useToggleElement(chartKey);
    const handleClick = React.useCallback(
      () => toggleElement(seriesKey),
      [seriesKey, toggleElement],
    );
    const ariaLabel =
      typeof label === "string" ? `Toggle ${label} series` : undefined;

    return (
      <button
        type="button"
        aria-pressed={!isHidden}
        aria-label={ariaLabel}
        className={cn(
          "flex cursor-pointer items-center gap-1.5 rounded focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-hidden [&>svg]:size-3 [&>svg]:text-muted-foreground",
          isHidden && "opacity-50",
        )}
        onClick={handleClick}
      >
        {Icon ? (
          <Icon />
        ) : (
          <span
            className="inline-block size-2 shrink-0 rounded-full md:size-3"
            style={{ backgroundColor: color }}
          />
        )}
        <span
          className={cn(
            "text-xs leading-none md:text-sm md:leading-none",
            isHidden && "line-through",
          )}
        >
          {label}
        </span>
      </button>
    );
  },
);
ChartLegendItem.displayName = "ChartLegendItem";

type ChartDotIndicatorProps = {
  indicator: "dot" | "line" | "dashed";
  nestLabel: boolean;
  indicatorColor: string;
};

function ChartDotIndicator({
  indicator,
  indicatorColor,
}: ChartDotIndicatorProps) {
  const style = {
    "--indicator-bg": indicatorColor,
    "--indicator-border": indicatorColor,
  } as React.CSSProperties;

  if (indicator === "dashed") {
    return <Dash style={style} />;
  }

  return (
    <div
      className={cn(
        "shrink-0 rounded-full border-(--indicator-border) bg-(--indicator-bg)",
        {
          "h-2.5 w-2.5": indicator === "dot",
          "w-1": indicator === "line",
        },
      )}
      style={style}
    />
  );
}

function formatTooltipValue(value: TooltipValueType) {
  return typeof value === "number" ? value.toLocaleString() : String(value);
}

function getPayloadConfigFromPayload(
  config: ChartConfig,
  payload: unknown,
  key: string,
) {
  if (typeof payload !== "object" || payload === null) {
    return undefined;
  }

  const payloadPayload =
    "payload" in payload &&
    typeof payload.payload === "object" &&
    payload.payload !== null
      ? payload.payload
      : undefined;

  let configLabelKey: string = key;

  if (
    key in payload &&
    typeof payload[key as keyof typeof payload] === "string"
  ) {
    configLabelKey = payload[key as keyof typeof payload] as string;
  } else if (
    payloadPayload &&
    key in payloadPayload &&
    typeof payloadPayload[key as keyof typeof payloadPayload] === "string"
  ) {
    configLabelKey = payloadPayload[
      key as keyof typeof payloadPayload
    ] as string;
  }

  return configLabelKey in config
    ? config[configLabelKey]
    : config[key as keyof typeof config];
}

export {
  ChartContainer,
  ChartDotIndicator,
  ChartLegend,
  ChartLegendContent,
  ChartStyle,
  ChartTooltip,
  ChartTooltipContent,
};
