import { cn } from "@/lib/utils/cn";
import { getChartColorVar } from "@/lib/utils/getChartColor";

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

const resolveColor = ({ index, color }: DotIndicatorProps) => {
  if (color) return color;
  if (index !== undefined) return getChartColorVar(index);
  return undefined;
};

const DotIndicator = (props: DotIndicatorProps) => (
  <span
    className={cn("size-3 rounded-full md:size-4", props.className)}
    style={{ backgroundColor: resolveColor(props) }}
  />
);

export default DotIndicator;
