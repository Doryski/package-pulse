import { BreakDropIndicator } from "@/lib/utils/calculateBreakDrop";
import { cn } from "@/lib/utils/cn";

type BreakDropIndicatorProps = {
  indicator: BreakDropIndicator;
  className?: string;
};

const corporateUsageLevelConfig = {
  very_high: {
    label: "Very High",
    color: "text-red-600 dark:text-red-400",
    bgColor: "bg-red-50 dark:bg-red-950",
    borderColor: "border-red-200 dark:border-red-800",
  },
  high: {
    label: "High",
    color: "text-orange-600 dark:text-orange-400",
    bgColor: "bg-orange-50 dark:bg-orange-950",
    borderColor: "border-orange-200 dark:border-orange-800",
  },
  moderate: {
    label: "Moderate",
    color: "text-yellow-600 dark:text-yellow-400",
    bgColor: "bg-yellow-50 dark:bg-yellow-950",
    borderColor: "border-yellow-200 dark:border-yellow-800",
  },
  low: {
    label: "Low",
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-50 dark:bg-blue-950",
    borderColor: "border-blue-200 dark:border-blue-800",
  },
  very_low: {
    label: "Very Low",
    color: "text-green-600 dark:text-green-400",
    bgColor: "bg-green-50 dark:bg-green-950",
    borderColor: "border-green-200 dark:border-green-800",
  },
};

export default function BreakDropIndicatorComponent({
  indicator,
  className,
}: BreakDropIndicatorProps) {
  if (!indicator.hasEnoughData) {
    return (
      <div
        className={cn(
          "flex items-center justify-center text-xs text-muted-foreground",
          className,
        )}
      >
        Insufficient data
      </div>
    );
  }

  const config = corporateUsageLevelConfig[indicator.corporateUsageLevel];

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-1",
        className,
      )}
    >
      <div
        className={cn(
          "inline-flex items-center rounded-full border px-2 py-1 text-xs font-medium",
          config.color,
          config.bgColor,
          config.borderColor,
        )}
      >
        {config.label} Corporate
      </div>
      <div className="text-xs text-muted-foreground">
        <div>Christmas: {indicator.christmasDropPercentage.toFixed(1)}%</div>
        <div>Weekend: {indicator.weekendDropPercentage.toFixed(1)}%</div>
        <div>Score: {indicator.corporateUsageScore.toFixed(1)}</div>
      </div>
    </div>
  );
}
