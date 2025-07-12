"use client";

import { cn } from "@/lib/utils/cn";
import getChartColor from "@/lib/utils/getChartColor";
import { useTheme } from "next-themes";

export type DotIndicatorProps = { className?: string } & (
  | {
      index: number;
      color?: never;
    }
  | {
      index?: never;
      color: string | undefined;
    }
);

const DotIndicator = ({ index, color, className }: DotIndicatorProps) => {
  const { resolvedTheme } = useTheme();

  const getFinalColor = () => {
    if (color) return color;
    if (index !== undefined) return getChartColor(resolvedTheme, index);
    return undefined;
  };

  return (
    <span
      className={cn("size-3 rounded-full md:size-4", className)}
      style={{
        backgroundColor: getFinalColor(),
      }}
    />
  );
};

export default DotIndicator;
