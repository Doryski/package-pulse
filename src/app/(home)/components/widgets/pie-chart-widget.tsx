"use client";
import normalizeProjectName from "@/app/(home)/utils/normalizeProjectName";
import { ProjectStatsQuery } from "@/lib/queries/useProjectsStats";
import { formatInteger, formatPercentage } from "@/lib/utils/formatters";
import { memo } from "react";
import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

type PieChartWidgetProps = {
  projectsStats: ProjectStatsQuery[];
};

const PieChartWidget = memo(({ projectsStats }: PieChartWidgetProps) => {
  const data = projectsStats
    .filter((project) => project.data)
    .map((project, index) => {
      const projectData = project.data!;
      const latestDownloads =
        projectData.rawSortedData.slice(-2)[0]?.count || 0;

      const normalizedName = normalizeProjectName(projectData.projectName);

      return {
        name: projectData.projectName,
        normalizedName: normalizedName,
        value: latestDownloads,
        fill: `var(--color-${normalizedName})`,
        index: index,
      };
    })
    .sort((a, b) => b.value - a.value);

  if (data.length === 0) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <div className="text-center">
          <div className="mb-2 text-4xl">📊</div>
          <p className="font-medium text-muted-foreground">No data available</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Add some projects to see the distribution
          </p>
        </div>
      </div>
    );
  }

  const renderCustomizedLabel = ({
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
    percent,
  }: {
    cx: number;
    cy: number;
    midAngle: number;
    innerRadius: number;
    outerRadius: number;
    percent: number;
  }) => {
    if (percent < 0.05) return null;

    const RADIAN = Math.PI / 180;
    const radiusFactor = percent > 0.5 ? 0.45 : 0.6;
    const radius = innerRadius + (outerRadius - innerRadius) * radiusFactor;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor={x > cx ? "start" : "end"}
        dominantBaseline="central"
        fontSize={11}
        fontWeight="600"
        className="drop-shadow-sm"
      >
        {formatPercentage(percent * 100, 1)}
      </text>
    );
  };

  const total = data.reduce((sum, item) => sum + item.value, 0);
  const enhancedData = data.map((item) => ({ ...item, total }));

  return (
    <div className="w-full">
      <style>
        {enhancedData
          .map(
            (item) => `
          [data-chart] {
            --color-${item.normalizedName}: hsl(var(--chart-${(item.index % 10) + 1}));
          }
        `,
          )
          .join("")}
      </style>
      <div className="h-[400px]" data-chart>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart margin={{ top: 20, right: 20, bottom: 40, left: 20 }}>
            <defs>
              {enhancedData.map((item) => {
                const gradientId = `gradient-${item.normalizedName}`;
                return (
                  <linearGradient
                    key={gradientId}
                    id={gradientId}
                    x1="0%"
                    y1="0%"
                    x2="100%"
                    y2="100%"
                  >
                    <stop offset="0%" stopColor={item.fill} stopOpacity={0.8} />
                    <stop offset="100%" stopColor={item.fill} stopOpacity={1} />
                  </linearGradient>
                );
              })}
            </defs>
            <Pie
              data={enhancedData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={renderCustomizedLabel}
              outerRadius={120}
              innerRadius={30}
              dataKey="value"
              animationBegin={0}
              animationDuration={800}
              animationEasing="ease-out"
            >
              {enhancedData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={`url(#gradient-${entry.normalizedName})`}
                  stroke="rgba(255,255,255,0.1)"
                  strokeWidth={1}
                  className="transition-opacity duration-200 hover:opacity-80"
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend content={<CustomLegend />} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
});

PieChartWidget.displayName = "PieChartWidget";

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0];
    const fillColor = `var(--color-${data.payload.normalizedName})`;

    return (
      <div className="min-w-[120px] rounded-lg border border-border bg-background/95 p-3 shadow-lg backdrop-blur-sm">
        <div className="mb-1 flex items-center gap-2">
          <div
            className="size-3 rounded-full"
            style={{ backgroundColor: fillColor }}
          />
          <p className="text-sm font-semibold">{data.payload.name}</p>
        </div>
        <p className="text-xs text-muted-foreground">
          Downloads:{" "}
          <span className="font-mono font-semibold text-foreground">
            {formatInteger(data.value)}
          </span>
        </p>
        <p className="text-xs text-muted-foreground">
          Share:{" "}
          <span className="font-semibold text-foreground">
            {formatPercentage((data.value / data.payload.total) * 100, 1)}
          </span>
        </p>
      </div>
    );
  }
  return null;
};

CustomTooltip.displayName = "CustomTooltip";

const CustomLegend = ({ payload }: any) => {
  return (
    <div className="flex items-center justify-center gap-x-4 px-4">
      {payload.map((entry: any, index: number) => {
        const fillColor = `var(--color-${entry.payload.normalizedName})`;

        return (
          <div key={index} className="flex items-center gap-1">
            <div
              className="size-3 rounded-full text-sm"
              style={{ backgroundColor: fillColor }}
            />
            <span className="text-sm font-medium text-foreground">
              {entry.value}
            </span>
          </div>
        );
      })}
    </div>
  );
};

CustomLegend.displayName = "CustomLegend";

export default PieChartWidget;
