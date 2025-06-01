"use client";
import useStatsMatrix from "@/lib/hooks/useStatsMatrix";
import { ProjectStatsQuery } from "@/lib/queries/useProjectsStats";
import {
  formatInteger,
  formatLargeNumber,
  formatPercentage,
} from "@/lib/utils/formatters";
import { round } from "@/lib/utils/math";
import { memo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import getPeakAndLatestDownloads from "../../utils/getPeakAndLatestStats";

export type BarChartMode = "downloads" | "growth";

export type BarChartWidgetProps = {
  projectsStats: ProjectStatsQuery[];
  comparisonMode?: BarChartMode;
};

const BarChartWidget = memo(
  ({ projectsStats, comparisonMode = "growth" }: BarChartWidgetProps) => {
    const statsMatrix = useStatsMatrix(projectsStats);
    const peakAndLatestStats = getPeakAndLatestDownloads(projectsStats);
    const data = statsMatrix.stats
      .map((projectData, index) => {
        const latestDownloads = peakAndLatestStats.find(
          (stat) => stat.name === projectData.projectName,
        )?.latestDownloads;

        const growthRate = projectData.weeklyChange?.percentage;

        return {
          name: projectData.projectName,
          downloads: latestDownloads,
          growth: growthRate ? round(growthRate, 2) : undefined,
          fill: `hsl(var(--chart-${(index % 10) + 1}))`,
        };
      })
      .sort((a, b) => {
        if (comparisonMode === "growth") {
          return (b.growth ?? 0) - (a.growth ?? 0);
        }
        return (b.downloads ?? 0) - (a.downloads ?? 0);
      });

    if (data.length === 0) {
      return (
        <div className="py-8 text-center text-muted-foreground">
          No data available
        </div>
      );
    }

    const getDataKey = () => {
      return comparisonMode === "growth" ? "growth" : "downloads";
    };

    const getYAxisLabel = () => {
      return comparisonMode === "growth" ? "Growth Rate (%)" : "Downloads";
    };

    const formatTooltipValue = (value: number) => {
      if (comparisonMode === "growth") {
        return [formatPercentage(value, 1), "Growth Rate"];
      }
      return [formatLargeNumber(value), "Downloads"];
    };

    return (
      <div className="h-[370px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="name"
              className="fill-muted-foreground text-xs"
              tick={{ fontSize: 12 }}
              interval={0}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis
              className="fill-muted-foreground text-xs"
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => {
                if (comparisonMode === "growth") {
                  return `${value}%`;
                }
                return formatLargeNumber(value);
              }}
              label={{
                value: getYAxisLabel(),
                angle: -90,
                position: "insideLeft",
              }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--background))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "6px",
              }}
              formatter={(value: number) => {
                return formatTooltipValue(value);
              }}
              labelFormatter={(label, payload) => {
                const value = payload?.[0]?.value;
                const growthValue: number | undefined =
                  payload?.[0]?.payload?.growth;
                return (
                  <div>
                    <div className="flex items-center gap-2">
                      <span>Project:</span>
                      <span>{label}</span>
                    </div>
                    {comparisonMode === "downloads" && value !== undefined && (
                      <div className="flex items-center gap-2">
                        <span>Downloads:</span>
                        <span>{formatInteger(value)}</span>
                      </div>
                    )}
                    {comparisonMode === "growth" &&
                      growthValue !== undefined && (
                        <div className="flex items-center gap-2">
                          <span>Growth rate:</span>
                          <span>{formatPercentage(growthValue)}</span>
                        </div>
                      )}
                  </div>
                );
              }}
            />
            <Bar dataKey={getDataKey()} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  },
);

BarChartWidget.displayName = "BarChartWidget";

export default BarChartWidget;
