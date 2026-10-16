"use client";
import { SimpleTooltip } from "@/components/simple-tooltip";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import usePendingProjectsStatsCount from "@/lib/queries/usePendingProjectsStatsCount";
import { ProjectStatsQuery } from "@/lib/queries/useProjectsStats";
import { cn } from "@/lib/utils/cn";
import { copyAsImage, downloadAsImage } from "@/lib/utils/imageExport";
import { ChevronDown, Copy, Download } from "lucide-react";
import dynamic from "next/dynamic";
import { ComponentType, memo, ReactNode, useRef, useState } from "react";
import { useWatch } from "react-hook-form";
import { ProjectsSearchFormValues } from "./projects-form/schema";
import type {
  BarChartMode,
  BarChartWidgetProps,
} from "./widgets/bar-chart-widget";
import type { StatsCardsWidgetRef } from "./widgets/stats-cards-widget";
import type { TrendWidgetRef } from "./widgets/trend-widget";

const SKELETON_ITEMS = [0, 1] as const;

const BarChartSkeleton = () => (
  <Skeleton aria-hidden="true" className="h-[370px] w-full" />
);

const PieChartSkeleton = () => (
  <Skeleton aria-hidden="true" className="h-100 w-full" />
);

const StatsCardsSkeleton = () => (
  <div aria-hidden="true" className="grid grid-cols-1 gap-4 sm:grid-cols-2">
    {SKELETON_ITEMS.map((item) => (
      <Skeleton key={item} className="h-44" />
    ))}
  </div>
);

const TrendSkeleton = () => (
  <div aria-hidden="true" className="space-y-3">
    {SKELETON_ITEMS.map((item) => (
      <Skeleton key={item} className="h-17" />
    ))}
  </div>
);

const BarChartWidget = dynamic(() => import("./widgets/bar-chart-widget"), {
  ssr: false,
  loading: BarChartSkeleton,
});

const PieChartWidget = dynamic(() => import("./widgets/pie-chart-widget"), {
  ssr: false,
  loading: PieChartSkeleton,
});

const StatsCardsWidget = dynamic(() => import("./widgets/stats-cards-widget"), {
  ssr: false,
  loading: StatsCardsSkeleton,
});

const TrendWidget = dynamic(() => import("./widgets/trend-widget"), {
  ssr: false,
  loading: TrendSkeleton,
});

type WidgetsSectionProps = {
  projectsStats: ProjectStatsQuery[];
};

type WidgetType = "bar-chart" | "pie-chart" | "stats-cards" | "trend";

type Widget = {
  id: WidgetType;
  title: string;
  description: string;
  component: ComponentType<
    {
      projectsStats: WidgetsSectionProps["projectsStats"];
    } & BarChartWidgetProps
  >;
  Skeleton: ComponentType;
};

const widgets: Widget[] = [
  {
    id: "stats-cards",
    title: "Stats Cards",
    description: "Key metrics in card format",
    component: StatsCardsWidget,
    Skeleton: StatsCardsSkeleton,
  },
  {
    id: "bar-chart",
    title: "Bar Chart",
    description: "Compare projects with bars",
    component: BarChartWidget,
    Skeleton: BarChartSkeleton,
  },
  {
    id: "pie-chart",
    title: "Pie Chart",
    description: "Project distribution",
    component: PieChartWidget,
    Skeleton: PieChartSkeleton,
  },
  {
    id: "trend",
    title: "Trend Indicators",
    description: "Growth trends overview",
    component: TrendWidget,
    Skeleton: TrendSkeleton,
  },
];

const WidgetExportSpinner = ({ widget }: { widget: Widget }) => (
  <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-background/50">
    <div
      role="status"
      aria-label={`Exporting ${widget.title} widget`}
      data-testid={`widget-export-loader-${widget.id}`}
      className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent motion-reduce:animate-none"
    />
  </div>
);

const WidgetCardHeading = ({ widget }: { widget: Widget }) => (
  <div>
    <CardTitle className="text-lg">{widget.title}</CardTitle>
    <p className="text-sm text-muted-foreground">{widget.description}</p>
  </div>
);

const WIDGET_HEADER_CLASS_NAME =
  "flex flex-col flex-wrap items-center justify-between gap-2 text-center sm:flex-row sm:text-left";

const WidgetCardSkeleton = ({ widget }: { widget: Widget }) => (
  <Card data-testid={`widget-skeleton-${widget.id}`}>
    <CardHeader className="pb-2">
      <div className={WIDGET_HEADER_CLASS_NAME}>
        <WidgetCardHeading widget={widget} />
        <Skeleton aria-hidden="true" className="h-8 w-20" />
      </div>
    </CardHeader>
    <CardContent className="pt-2">
      <widget.Skeleton />
    </CardContent>
  </Card>
);

const WidgetCard = memo(
  ({
    widget,
    projectsStats,
  }: {
    widget: Widget;
    projectsStats: WidgetsSectionProps["projectsStats"];
  }) => {
    const cardRef = useRef<HTMLDivElement>(null);
    const statsCardsRef = useRef<StatsCardsWidgetRef>(null);
    const trendWidgetRef = useRef<TrendWidgetRef>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [barChartMode, setBarChartMode] = useState<BarChartMode>("growth");

    const handleDownload = async () => {
      if (!cardRef.current) return;
      setIsLoading(true);
      await downloadAsImage(cardRef.current, `${widget.id}-widget`);
      setIsLoading(false);
    };

    const handleDownloadProjectCard = async (projectName: string) => {
      let projectCardElement: HTMLElement | null = null;

      if (widget.id === "stats-cards" && statsCardsRef.current) {
        projectCardElement =
          statsCardsRef.current.getProjectCardElement(projectName);
      } else if (widget.id === "trend" && trendWidgetRef.current) {
        projectCardElement =
          trendWidgetRef.current.getTrendCardElement(projectName);
      }

      if (!projectCardElement) return;

      setIsLoading(true);
      await downloadAsImage(
        projectCardElement,
        `${projectName}-${widget.id}-card`,
      );
      setIsLoading(false);
    };

    const handleCopyImage = async () => {
      if (!cardRef.current) return;
      setIsLoading(true);
      await copyAsImage(cardRef.current);
      setIsLoading(false);
    };

    const handleCopyProjectCard = async (projectName: string) => {
      let projectCardElement: HTMLElement | null = null;

      if (widget.id === "stats-cards" && statsCardsRef.current) {
        projectCardElement =
          statsCardsRef.current.getProjectCardElement(projectName);
      } else if (widget.id === "trend" && trendWidgetRef.current) {
        projectCardElement =
          trendWidgetRef.current.getTrendCardElement(projectName);
      }

      if (!projectCardElement) return;

      setIsLoading(true);
      await copyAsImage(projectCardElement);
      setIsLoading(false);
    };

    const availableProjects = projectsStats
      .filter((project) => project.data)
      .map((project) => project.data!.projectName);

    const isStatsCardsWidget = widget.id === "stats-cards";
    const isTrendWidget = widget.id === "trend";
    const hasIndividualCards = isStatsCardsWidget || isTrendWidget;

    return (
      <Card className="relative">
        <CardHeader className="pb-2">
          <div className={WIDGET_HEADER_CLASS_NAME}>
            <WidgetCardHeading widget={widget} />
            <div className="flex gap-1">
              {widget.id === "bar-chart" && (
                <ToggleGroup
                  type="single"
                  aria-label="Bar chart mode"
                  value={barChartMode}
                  onValueChange={(value) =>
                    value && setBarChartMode(value as BarChartMode)
                  }
                  size="sm"
                >
                  <ToggleGroupItem value="downloads">Downloads</ToggleGroupItem>
                  <ToggleGroupItem value="growth">Growth</ToggleGroupItem>
                </ToggleGroup>
              )}
              {hasIndividualCards && availableProjects.length > 0 ? (
                <div className="flex">
                  <SimpleTooltip content="Download as PNG">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleDownload}
                      disabled={isLoading}
                      className="rounded-r-none border-r border-border/50"
                      aria-label="Download widget as PNG"
                    >
                      <Download className="size-4" />
                    </Button>
                  </SimpleTooltip>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={isLoading}
                        className="rounded-l-none px-1"
                        aria-label="Download a single project card"
                      >
                        <ChevronDown className="size-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {availableProjects.map((projectName) => (
                        <DropdownMenuItem
                          key={projectName}
                          onClick={() => handleDownloadProjectCard(projectName)}
                          className="flex items-center gap-1"
                        >
                          <span>Download</span>
                          <span className="italic">{projectName}</span>
                          <span>card</span>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ) : (
                <SimpleTooltip content="Download as PNG">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleDownload}
                    disabled={isLoading}
                    aria-label="Download widget as PNG"
                  >
                    <Download className="size-4" />
                  </Button>
                </SimpleTooltip>
              )}

              {hasIndividualCards && availableProjects.length > 0 ? (
                <div className="flex">
                  <SimpleTooltip content="Copy as image">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleCopyImage}
                      disabled={isLoading}
                      className="rounded-r-none border-r border-border/50"
                      aria-label="Copy widget as image"
                    >
                      <Copy className="size-4" />
                    </Button>
                  </SimpleTooltip>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={isLoading}
                        className="rounded-l-none px-1"
                        aria-label="Copy a single project card"
                      >
                        <ChevronDown className="size-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {availableProjects.map((projectName) => (
                        <DropdownMenuItem
                          key={projectName}
                          onClick={() => handleCopyProjectCard(projectName)}
                          className="flex items-center gap-1"
                        >
                          <span>Copy</span>
                          <span className="italic">{projectName}</span>
                          <span>card</span>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ) : (
                <SimpleTooltip content="Copy as image">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCopyImage}
                    disabled={isLoading}
                    aria-label="Copy widget as image"
                  >
                    <Copy className="size-4" />
                  </Button>
                </SimpleTooltip>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent ref={cardRef} className="pt-2">
          {isStatsCardsWidget ? (
            <StatsCardsWidget
              ref={statsCardsRef}
              projectsStats={projectsStats}
            />
          ) : isTrendWidget ? (
            <TrendWidget ref={trendWidgetRef} projectsStats={projectsStats} />
          ) : (
            <widget.component
              projectsStats={projectsStats}
              comparisonMode={barChartMode || undefined}
            />
          )}
        </CardContent>
        {isLoading && <WidgetExportSpinner widget={widget} />}
      </Card>
    );
  },
);

WidgetCard.displayName = "WidgetCard";

const WidgetsLayout = ({
  children,
  isBusy,
}: {
  children: ReactNode;
  isBusy: boolean;
}) => (
  <div
    data-testid="widgets-section"
    aria-busy={isBusy || undefined}
    className={cn("mt-8 w-full lg:mt-16")}
  >
    <div className="mb-6">
      <h2 className="mb-2 text-center text-2xl font-bold">Widgets</h2>
      <p className="text-center text-muted-foreground">
        Interactive widgets you can download or copy
      </p>
    </div>
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">{children}</div>
  </div>
);

const WidgetsSection = memo(({ projectsStats }: WidgetsSectionProps) => {
  const selectedProjects = useWatch<ProjectsSearchFormValues, "projects">({
    name: "projects",
  });
  const pendingCount = usePendingProjectsStatsCount(selectedProjects);
  const hasData = projectsStats.some((project) => project.data);

  if (pendingCount > 0) {
    return (
      <WidgetsLayout isBusy>
        {widgets.map((widget) => (
          <WidgetCardSkeleton key={widget.id} widget={widget} />
        ))}
      </WidgetsLayout>
    );
  }

  if (!hasData) return null;

  return (
    <WidgetsLayout isBusy={false}>
      {widgets.map((widget) => (
        <WidgetCard
          key={widget.id}
          widget={widget}
          projectsStats={projectsStats}
        />
      ))}
    </WidgetsLayout>
  );
});

WidgetsSection.displayName = "WidgetsSection";

export default WidgetsSection;
