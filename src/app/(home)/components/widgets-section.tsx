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
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ProjectStatsQuery } from "@/lib/queries/useProjectsStats";
import { cn } from "@/lib/utils/cn";
import { downloadFile } from "@/lib/utils/exportUtils";
import { ChevronDownIcon, CopyIcon, DownloadIcon } from "@radix-ui/react-icons";
import { memo, useRef, useState } from "react";
import { toast } from "sonner";
import BarChartWidget, {
  BarChartMode,
  BarChartWidgetProps,
} from "./widgets/bar-chart-widget";
import PieChartWidget from "./widgets/pie-chart-widget";
import StatsCardsWidget, {
  StatsCardsWidgetRef,
} from "./widgets/stats-cards-widget";
import TrendWidget, { TrendWidgetRef } from "./widgets/trend-widget";

type WidgetsSectionProps = {
  projectsStats: ProjectStatsQuery[];
};

type WidgetType = "bar-chart" | "pie-chart" | "stats-cards" | "trend";

type Widget = {
  id: WidgetType;
  title: string;
  description: string;
  component: React.ComponentType<
    {
      projectsStats: WidgetsSectionProps["projectsStats"];
    } & BarChartWidgetProps
  >;
};

const widgets: Widget[] = [
  {
    id: "stats-cards",
    title: "Stats Cards",
    description: "Key metrics in card format",
    component: StatsCardsWidget,
  },
  {
    id: "bar-chart",
    title: "Bar Chart",
    description: "Compare projects with bars",
    component: BarChartWidget,
  },
  {
    id: "pie-chart",
    title: "Pie Chart",
    description: "Project distribution",
    component: PieChartWidget,
  },
  {
    id: "trend",
    title: "Trend Indicators",
    description: "Growth trends overview",
    component: TrendWidget,
  },
];

async function convertHtmlToImage(element: HTMLElement) {
  const html2canvas = (await import("html2canvas")).default;

  return html2canvas(element, {
    backgroundColor: "transparent",
    scale: 2,
    useCORS: true,
    allowTaint: true,
  } as any);
}

const downloadAsImage = async (element: HTMLElement, filename: string) => {
  try {
    const canvas = await convertHtmlToImage(element);

    downloadFile(`${filename}.png`, canvas.toDataURL());

    toast.success("Widget downloaded as image");
  } catch (error) {
    console.error("Error downloading widget:", error);
    toast.error("Failed to download widget");
  }
};

const copyAsImage = async (element: HTMLElement) => {
  try {
    const canvas = await convertHtmlToImage(element);

    canvas.toBlob(async (blob: Blob | null) => {
      if (blob) {
        try {
          await navigator.clipboard.write([
            new ClipboardItem({ "image/png": blob }),
          ]);
          toast.success("Widget copied to clipboard");
        } catch (error) {
          console.error("Error copying to clipboard:", error);
          toast.error("Failed to copy widget");
        }
      }
    });
  } catch (error) {
    console.error("Error copying widget:", error);
    toast.error("Failed to copy widget");
  }
};

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
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">{widget.title}</CardTitle>
              <p className="text-sm text-muted-foreground">
                {widget.description}
              </p>
            </div>
            <div className="flex gap-1">
              {widget.id === "bar-chart" && (
                <ToggleGroup
                  type="single"
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
                    >
                      <DownloadIcon className="size-4" />
                    </Button>
                  </SimpleTooltip>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={isLoading}
                        className="rounded-l-none px-1"
                      >
                        <ChevronDownIcon className="size-3" />
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
                          <span>{isStatsCardsWidget ? "card" : "trend"}</span>
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
                  >
                    <DownloadIcon className="size-4" />
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
                    >
                      <CopyIcon className="size-4" />
                    </Button>
                  </SimpleTooltip>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={isLoading}
                        className="rounded-l-none px-1"
                      >
                        <ChevronDownIcon className="size-3" />
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
                  >
                    <CopyIcon className="size-4" />
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
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-background/50">
            <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        )}
      </Card>
    );
  },
);

WidgetCard.displayName = "WidgetCard";

const WidgetsSection = memo(({ projectsStats }: WidgetsSectionProps) => {
  const isLoading = projectsStats.some((project) => project.isLoading);
  const hasData = projectsStats.some((project) => project.data);

  if (isLoading || !hasData) {
    return null;
  }

  return (
    <div className={cn("mt-8 lg:mt-16 w-full")}>
      <div className="mb-6">
        <h2 className="mb-2 text-center text-2xl font-bold">Widgets</h2>
        <p className="text-center text-muted-foreground">
          Interactive widgets you can download or copy
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {widgets.map((widget) => (
          <WidgetCard
            key={widget.id}
            widget={widget}
            projectsStats={projectsStats}
          />
        ))}
      </div>
    </div>
  );
});

WidgetsSection.displayName = "WidgetsSection";

export default WidgetsSection;
