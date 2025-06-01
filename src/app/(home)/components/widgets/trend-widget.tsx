"use client";
import ArrowIndicator from "@/components/ui/arrow-indicator";
import useStatsMatrix from "@/lib/hooks/useStatsMatrix";
import { ProjectStatsQuery } from "@/lib/queries/useProjectsStats";
import { cn } from "@/lib/utils/cn";
import { formatInteger, formatPercentage } from "@/lib/utils/formatters";
import { forwardRef, memo, useImperativeHandle, useRef } from "react";
import getPeakAndLatestDownloads from "../../utils/getPeakAndLatestStats";

type TrendWidgetProps = {
  projectsStats: ProjectStatsQuery[];
};

export type TrendWidgetRef = {
  getTrendCardElement: (projectName: string) => HTMLElement | null;
};

const TrendWidget = memo(
  forwardRef<TrendWidgetRef, TrendWidgetProps>(({ projectsStats }, ref) => {
    const cardRefs = useRef<Map<string, HTMLElement>>(new Map());
    const peakAndLatestStats = getPeakAndLatestDownloads(projectsStats);
    const statsMatrix = useStatsMatrix(projectsStats);
    const trends = statsMatrix.stats
      .map((projectData, index) => {
        const latestDownloads = peakAndLatestStats.find(
          (stat) => stat.name === projectData.projectName,
        )?.latestDownloads;

        return {
          name: projectData.projectName,
          latestDownloads,
          weeklyChange: projectData.weeklyChange,
          color: `hsl(var(--chart-${(index % 10) + 1}))`,
        };
      })
      .filter((trend): trend is NonNullable<typeof trend> => trend !== null)
      .toSorted(
        (a, b) =>
          (b.weeklyChange?.percentage ?? 0) - (a.weeklyChange?.percentage ?? 0),
      );

    useImperativeHandle(ref, () => ({
      getTrendCardElement: (projectName: string) => {
        return cardRefs.current.get(projectName) || null;
      },
    }));

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
            ref={(el) => {
              if (el) {
                cardRefs.current.set(trend.name, el);
              } else {
                cardRefs.current.delete(trend.name);
              }
            }}
            className="flex items-center justify-between rounded-lg border bg-background p-4 transition-colors hover:bg-muted/50"
          >
            <div className="flex items-center gap-3">
              <div
                className="size-3 shrink-0 rounded-full"
                style={{ backgroundColor: trend.color }}
              />
              <div>
                <div className="text-sm font-medium">{trend.name}</div>
                <div className="text-xs text-muted-foreground">
                  {formatInteger(trend.latestDownloads ?? 0)} downloads
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="text-right">
                <div className="flex items-center gap-1">
                  <span
                    className={cn(
                      "text-sm font-medium",
                      trend.weeklyChange?.nominal &&
                        trend.weeklyChange.nominal > 0
                        ? "text-green-600"
                        : "text-red-600",
                    )}
                  >
                    {trend.weeklyChange?.nominal &&
                    trend.weeklyChange.nominal > 0
                      ? "+"
                      : ""}
                    {formatInteger(trend.weeklyChange?.nominal ?? 0)}
                  </span>
                  <ArrowIndicator value={trend.weeklyChange?.nominal ?? 0} />
                </div>
                <div
                  className={cn(
                    "text-xs",
                    trend.weeklyChange?.percentage &&
                      trend.weeklyChange.percentage > 0
                      ? "text-green-600"
                      : "text-red-600",
                  )}
                >
                  {formatPercentage(trend.weeklyChange?.percentage ?? 0)}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }),
);

TrendWidget.displayName = "TrendWidget";

export default TrendWidget;
