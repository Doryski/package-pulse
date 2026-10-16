import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import ClientOnly from "@/components/ui/client-only";
import DotIndicator from "@/components/ui/dot-indicator";
import { cn } from "@/lib/utils/cn";
import { ReactNode } from "react";

type ComparisonCardProps = {
  projects: string[];
  onProjectsClick: (projects: string[]) => void;
  title: string;
  className?: string;
  headerExtra?: ReactNode;
};

const ComparisonCard = ({
  projects,
  onProjectsClick,
  title,
  className,
  headerExtra,
}: ComparisonCardProps) => {
  const defaultFooterText = `Press to compare ${
    projects.length === 1 ? "this project" : `these ${projects.length} projects`
  }`;

  const projectsLabel = projects.join(", ");
  const cardLabel = title
    ? `Compare ${title}: ${projectsLabel}`
    : `Compare ${projectsLabel}`;

  return (
    <Card
      className={cn(
        "relative cursor-pointer transition-all duration-200",
        "hover:bg-accent/50 hover:shadow-md",
        "border hover:border-primary/20",
        "flex min-h-40 flex-col",
        className,
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {title}
          </CardTitle>
          <div className="relative z-10">{headerExtra}</div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col justify-between pt-0">
        <div className="flex flex-wrap gap-2">
          {projects.map((project, index) => (
            <div
              key={project}
              className="flex items-center gap-1.5 rounded-md bg-muted/50 px-2 py-1"
            >
              <ClientOnly>
                <DotIndicator index={index} className="size-2 md:size-3 " />
              </ClientOnly>
              <span className="text-xs font-medium">{project}</span>
            </div>
          ))}
        </div>
        <button
          type="button"
          aria-label={cardLabel}
          onClick={() => onProjectsClick(projects)}
          className={cn(
            "mt-3 text-left text-xs text-muted-foreground outline-none",
            "after:absolute after:inset-0 after:rounded-[inherit] after:content-['']",
            "focus-visible:after:ring-2 focus-visible:after:ring-ring",
          )}
        >
          {defaultFooterText}
        </button>
      </CardContent>
    </Card>
  );
};

type ComparisonCardSkeletonProps = {
  className?: string;
  projectCount?: number;
};

const getSkeletonBadgeWidth = (index: number) => 60 + ((index * 17) % 40);

export const ComparisonCardSkeleton = ({
  className,
  projectCount = 2,
}: ComparisonCardSkeletonProps) => {
  return (
    <Card className={cn("flex min-h-40 animate-pulse flex-col", className)}>
      <CardHeader className="pb-3">
        <div className="h-4 w-24 rounded bg-muted" />
      </CardHeader>
      <CardContent className="flex flex-1 flex-col justify-between pt-0">
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: projectCount }).map((_, index) => (
            <div
              key={index}
              className="h-6 w-16 rounded bg-muted"
              style={{ width: `${getSkeletonBadgeWidth(index)}px` }}
            />
          ))}
        </div>
        <div className="mt-3 h-3 w-32 rounded bg-muted" />
      </CardContent>
    </Card>
  );
};

export default ComparisonCard;
