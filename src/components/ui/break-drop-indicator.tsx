import { SimpleTooltip } from "@/components/simple-tooltip";
import { BreakDropIndicator } from "@/lib/utils/calculateBreakDrop";
import { cn } from "@/lib/utils/cn";
import { formatPercentage } from "@/lib/utils/formatters";
import {
  ExclamationTriangleIcon,
  InfoCircledIcon,
} from "@radix-ui/react-icons";

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
          "flex items-center justify-center gap-2 text-xs text-muted-foreground",
          className,
        )}
      >
        <span>Insufficient data</span>
        <SimpleTooltip
          content={
            <div className="max-w-xs">
              <p className="mb-2 font-medium">Insufficient Data</p>
              <p className="text-sm">
                Not enough download data to calculate corporate usage
                indicators. Requires at least 365 days of data with minimum
                10,000 average daily downloads.
              </p>
            </div>
          }
        >
          <InfoCircledIcon className="size-4 cursor-help text-muted-foreground" />
        </SimpleTooltip>
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
      <div className="flex items-center gap-1">
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
        <SimpleTooltip
          content={
            <div className="max-w-xs">
              <p className="mb-2 text-xs font-medium">
                Corporate Usage Analysis
              </p>
              <p className="mb-2 text-xs">
                This analysis examines download patterns to estimate corporate
                vs individual usage by looking at activity during business vs
                non-business hours:
              </p>
              <ul className="mb-2 list-inside list-disc space-y-1 text-xs">
                <li>
                  <strong>Christmas Drop:</strong> Reduction during Christmas
                  holiday period
                </li>
                <li>
                  <strong>Weekend Drop:</strong> Reduction during weekends vs
                  weekdays
                </li>
              </ul>
              <p className="mb-2 text-xs">
                Higher percentages suggest more corporate usage, as business
                applications, CI/CD pipelines, and automated deployment systems
                typically show reduced activity during non-business hours and
                holiday periods when development teams are offline.
              </p>
              <div className="text-orange-500 dark:text-orange-500">
                <ExclamationTriangleIcon className="size-4 min-h-4 min-w-4" />
                <p className="flex items-center gap-1 text-xs font-medium">
                  Use as a general indicator only. Individual projects may have
                  different usage patterns regardless of their target audience.
                </p>
              </div>
            </div>
          }
        >
          <InfoCircledIcon className="size-4 cursor-help text-muted-foreground" />
        </SimpleTooltip>
      </div>
      <div className="text-xs text-muted-foreground">
        <div>
          Christmas: {formatPercentage(indicator.christmasDropPercentage, 1)}
        </div>
        <div>
          Weekend: {formatPercentage(indicator.weekendDropPercentage, 1)}
        </div>
      </div>
    </div>
  );
}
