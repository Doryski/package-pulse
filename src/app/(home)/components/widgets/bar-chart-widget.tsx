"use client";
import useStatsMatrix from "@/lib/hooks/useStatsMatrix";
import { ProjectStatsQuery } from "@/lib/queries/useProjectsStats";
import {
  formatInteger,
  formatLargeNumber,
  formatPercentage,
} from "@/lib/utils/formatters";
import { round } from "@/lib/utils/math";
import { memo, type ReactNode, useCallback, useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  type TooltipValueType,
  XAxis,
  YAxis,
} from "recharts";
import getPeakAndLatestDownloads from "../../utils/getPeakAndLatestStats";

const AXIS_TEXT_CLASS_NAME = "fill-muted-foreground text-xs";

const ZERO_BASELINE_DOMAIN = [
  (dataMin: number) => Math.min(0, dataMin),
  (dataMax: number) => Math.max(0, dataMax),
] as const;

const AXIS_TICK = { fontSize: 12, className: AXIS_TEXT_CLASS_NAME } as const;

const CHART_MARGIN = { top: 20, right: 30, left: 20, bottom: 5 } as const;

const BAR_RADIUS: [number, number, number, number] = [4, 4, 0, 0];

const TOOLTIP_CONTENT_STYLE = {
  backgroundColor: "hsl(var(--background))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "6px",
} as const;

const buildYAxisLabel = (value: string) =>
  ({
    value,
    angle: -90,
    position: "insideLeft",
    className: AXIS_TEXT_CLASS_NAME,
  }) as const;

type TooltipPayloadItem = { value?: unknown; payload?: { growth?: number } };

type LabelPayload = ReadonlyArray<TooltipPayloadItem> | undefined;

function LabelRow({ name, value }: { name: string; value: string }) {
  return (
    <span className="flex items-center gap-2">
      <span>{name}</span>
      <span>{value}</span>
    </span>
  );
}

function ProjectLabel({
  label,
  children,
}: {
  label: ReactNode;
  children: ReactNode;
}) {
  return (
    <span className="block">
      <span className="flex items-center gap-2">
        <span>Project:</span>
        <span>{label}</span>
      </span>
      {children}
    </span>
  );
}

const renderDownloadsLabel = (label: ReactNode, payload: LabelPayload) => {
  const value = payload?.[0]?.value;
  return (
    <ProjectLabel label={label}>
      {typeof value === "number" && (
        <LabelRow name="Downloads:" value={formatInteger(value)} />
      )}
    </ProjectLabel>
  );
};

const renderGrowthLabel = (label: ReactNode, payload: LabelPayload) => {
  const growthValue = payload?.[0]?.payload?.growth;
  return (
    <ProjectLabel label={label}>
      {growthValue !== undefined && (
        <LabelRow name="Growth rate:" value={formatPercentage(growthValue)} />
      )}
    </ProjectLabel>
  );
};

const toTooltipEntry = (value: string, name: string): [string, string] => [
  value,
  name,
];

const MODE_CONFIG = {
  growth: {
    dataKey: "growth",
    yAxisLabel: buildYAxisLabel("Growth Rate (%)"),
    formatTick: (value: number) => `${value}%`,
    formatValue: (value: number) =>
      toTooltipEntry(formatPercentage(value, 1), "Growth Rate"),
    renderLabel: renderGrowthLabel,
  },
  downloads: {
    dataKey: "downloads",
    yAxisLabel: buildYAxisLabel("Downloads"),
    formatTick: (value: number) => formatLargeNumber(value),
    formatValue: (value: number) =>
      toTooltipEntry(formatLargeNumber(value), "Downloads"),
    renderLabel: renderDownloadsLabel,
  },
} as const;

export type BarChartMode = keyof typeof MODE_CONFIG;

type BarDatum = {
  name: string;
  downloads?: number;
  growth?: number;
  fill: string;
};

const buildBarData = (
  projectsStats: ProjectStatsQuery[],
  { stats }: ReturnType<typeof useStatsMatrix>,
) => {
  const latestByName = new Map(
    getPeakAndLatestDownloads(projectsStats).map((stat) => [
      stat.name,
      stat.latestDownloads,
    ]),
  );
  return stats.map<BarDatum>((projectData, index) => {
    const growthRate = projectData.weeklyChange?.percentage;
    return {
      name: projectData.projectName,
      downloads: latestByName.get(projectData.projectName),
      growth: growthRate ? round(growthRate, 2) : undefined,
      fill: `hsl(var(--chart-${(index % 10) + 1}))`,
    };
  });
};

const sortByMode = (data: BarDatum[], mode: BarChartMode) => {
  const { dataKey } = MODE_CONFIG[mode];
  return [...data].sort((a, b) => (b[dataKey] ?? 0) - (a[dataKey] ?? 0));
};

export type BarChartWidgetProps = {
  projectsStats: ProjectStatsQuery[];
  comparisonMode?: BarChartMode;
};

const BarChartWidget = memo(
  ({ projectsStats, comparisonMode = "growth" }: BarChartWidgetProps) => {
    const statsMatrix = useStatsMatrix(projectsStats);
    const barData = useMemo(
      () => buildBarData(projectsStats, statsMatrix),
      [projectsStats, statsMatrix],
    );
    const data = useMemo(
      () => sortByMode(barData, comparisonMode),
      [barData, comparisonMode],
    );
    const modeConfig = MODE_CONFIG[comparisonMode];

    const formatTooltip = useCallback(
      (value: TooltipValueType | undefined) => {
        if (typeof value !== "number") return value;
        return modeConfig.formatValue(value);
      },
      [modeConfig],
    );

    if (data.length === 0) {
      return (
        <div className="py-8 text-center text-muted-foreground">
          No data available
        </div>
      );
    }

    return (
      <div className="h-[370px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={CHART_MARGIN}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="name"
              tick={AXIS_TICK}
              interval={0}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis
              tick={AXIS_TICK}
              domain={ZERO_BASELINE_DOMAIN}
              tickFormatter={modeConfig.formatTick}
              label={modeConfig.yAxisLabel}
            />
            <Tooltip
              contentStyle={TOOLTIP_CONTENT_STYLE}
              formatter={formatTooltip}
              labelFormatter={modeConfig.renderLabel}
            />
            <Bar
              dataKey={modeConfig.dataKey}
              radius={BAR_RADIUS}
              isAnimationActive={false}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  },
);

BarChartWidget.displayName = "BarChartWidget";

export default BarChartWidget;
