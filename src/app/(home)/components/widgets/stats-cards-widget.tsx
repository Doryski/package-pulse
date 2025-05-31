"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProjectStatsQuery } from "@/lib/queries/useProjectsStats";
import { formatInteger } from "@/lib/utils/formatters";
import { max } from "@/lib/utils/math";
import { forwardRef, memo, useImperativeHandle, useRef } from "react";

type StatsCardsWidgetProps = {
  projectsStats: ProjectStatsQuery[];
};

export type StatsCardsWidgetRef = {
  getProjectCardElement: (projectName: string) => HTMLElement | null;
};

const StatsCardsWidget = memo(
  forwardRef<StatsCardsWidgetRef, StatsCardsWidgetProps>(
    ({ projectsStats }, ref) => {
      const cardRefs = useRef<Map<string, HTMLElement>>(new Map());

      const stats = projectsStats
        .filter((project) => project.data)
        .map((project) => {
          const data = project.data!;
          const latestDownloads = data.rawSortedData.slice(-2)[0]?.count || 0;
          const peakDownloads = max(data.rawSortedData, (item) => item.count);

          return {
            name: data.projectName,
            latestDownloads,
            peakDownloads: peakDownloads?.count || 0,
          };
        });

      useImperativeHandle(ref, () => ({
        getProjectCardElement: (projectName: string) => {
          return cardRefs.current.get(projectName) || null;
        },
      }));

      if (stats.length === 0) {
        return (
          <div className="py-8 text-center text-muted-foreground">
            No data available
          </div>
        );
      }

      return (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {stats.map((stat, index) => (
            <Card
              key={stat.name}
              ref={(el) => {
                if (el) {
                  cardRefs.current.set(stat.name, el);
                } else {
                  cardRefs.current.delete(stat.name);
                }
              }}
              className={`relative overflow-hidden shadow-none ${
                stats.length % 2 === 1 && index === stats.length - 1
                  ? "sm:col-span-2 sm:w-full sm:max-w-[calc(50%-0.5rem)] sm:justify-self-center"
                  : ""
              }`}
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2">
                  <div>
                    <div className="text-2xl font-bold">
                      {formatInteger(stat.latestDownloads)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Latest downloads
                    </p>
                  </div>
                  <div>
                    <div className="text-lg font-semibold text-muted-foreground">
                      {formatInteger(stat.peakDownloads)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Peak downloads
                    </p>
                  </div>
                </div>
              </CardContent>
              <div
                className="absolute right-0 top-0 h-full w-1"
                style={{
                  backgroundColor: `hsl(var(--chart-${(index % 10) + 1}))`,
                }}
              />
            </Card>
          ))}
        </div>
      );
    },
  ),
);

StatsCardsWidget.displayName = "StatsCardsWidget";

export default StatsCardsWidget;
