import { TooltipProps } from "@radix-ui/react-tooltip";
import { cva, type VariantProps } from "class-variance-authority";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

const tooltipContentVariants = cva("", {
  variants: {
    variant: {
      default: "",
      error: "bg-destructive text-destructive-foreground",
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

export type SimpleTooltipProps = {
  children: React.ReactNode;
  content: React.ReactNode;
} & TooltipProps &
  VariantProps<typeof tooltipContentVariants>;

export function SimpleTooltip({
  children,
  content,
  variant,
  ...props
}: SimpleTooltipProps) {
  return (
    <Tooltip {...props}>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent className={tooltipContentVariants({ variant })}>
        {content}
      </TooltipContent>
    </Tooltip>
  );
}
