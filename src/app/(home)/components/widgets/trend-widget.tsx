"use client";
import ArrowIndicator from "@/components/ui/arrow-indicator";
import { ProjectStatsQuery } from "@/lib/queries/useProjectsStats";
import { cn } from "@/lib/utils/cn";
import { formatInteger, formatPercentage } from "@/lib/utils/formatters";
import getPercentChange from "@/lib/utils/getPercentChange";
import { groupStats } from "@/lib/utils/groupByPeriod";
import { memo } from "react";

type TrendWidgetProps = {
  projectsStats: ProjectStatsQuery[];
};

const TrendWidget = memo(({ projectsStats }: TrendWidgetProps) => {
  const trends = projectsStats
    .filter((project) => project.data)
    .map((project, index) => {
      const rawData = project.data!.rawSortedData;
      const groupedStats = groupStats(rawData);

      const currentWeek = groupedStats.byWeeks.slice(-2)[0];
      const previousWeek = groupedStats.byWeeks.slice(-3)[0];

      if (!currentWeek || !previousWeek) {
        return null;
      }

      const current = currentWeek.count;
      const previous = previousWeek.count;
      const change = current - previous;
      const percentage = getPercentChange(current, previous);

      return {
        name: project.data!.projectName,
        current,
        previous,
        change,
        percentage,
        isPositive: change >= 0,
        color: `hsl(var(--chart-${(index % 10) + 1}))`,
      };
    })
    .filter((trend): trend is NonNullable<typeof trend> => trend !== null)
    .sort((a, b) => Math.abs(b.percentage) - Math.abs(a.percentage));

  if (trends.length === 0) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        No data available
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {trends.map((trend) => (
        <div
          key={trend.name}
          className="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-muted/50"
        >
          <div className="flex items-center gap-3">
            <div
              className="size-3 shrink-0 rounded-full"
              style={{ backgroundColor: trend.color }}
            />
            <div>
              <div className="text-sm font-medium">{trend.name}</div>
              <div className="text-xs text-muted-foreground">
                {formatInteger(trend.current)} downloads
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="text-right">
              <div className="flex items-center gap-1">
                <span
                  className={cn(
                    "text-sm font-medium",
                    trend.isPositive ? "text-green-600" : "text-red-600",
                  )}
                >
                  {trend.isPositive ? "+" : ""}
                  {formatInteger(trend.change)}
                </span>
                <ArrowIndicator value={trend.change} />
              </div>
              <div
                className={cn(
                  "text-xs",
                  trend.isPositive ? "text-green-600" : "text-red-600",
                )}
              >
                {formatPercentage(trend.percentage)}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
});

TrendWidget.displayName = "TrendWidget";

export default TrendWidget;
