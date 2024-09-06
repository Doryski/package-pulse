import { cn } from "@/lib/utils/cn";

type ArrowIndicatorProps = {
  value: number | undefined;
};

const ArrowIndicator = ({ value }: ArrowIndicatorProps) => {
  if (value === undefined) return null;

  const isPositive = value > 0;
  const color = isPositive ? "text-green-700" : "text-red-700";
  const arrow = isPositive ? "↑" : "↓";

  return <div className={cn(color, "text-xl")}>{arrow}</div>;
};

export default ArrowIndicator;
