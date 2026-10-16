import { cn } from "@/lib/utils/cn";
import { X } from "lucide-react";
import { Button } from "./button";
import { Tooltip, TooltipContent, TooltipTrigger } from "./tooltip";

type TagProps = {
  children: React.ReactNode;
  onRemove: () => void;
  removeLabel: string;
  tooltipContent?: React.ReactNode;
} & React.HTMLAttributes<HTMLDivElement>;

const Tag = ({
  children,
  onRemove,
  removeLabel,
  tooltipContent,
  ...props
}: TagProps) => {
  return (
    <div
      {...props}
      className={cn(
        `flex items-center gap-2 rounded-md bg-accent px-2
      py-1 text-sm text-accent-foreground`,
        props.className,
      )}
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="link"
            size="icon"
            onClick={onRemove}
            aria-label={removeLabel}
          >
            <X className="size-4" aria-hidden />
          </Button>
        </TooltipTrigger>
        <TooltipContent>{tooltipContent ?? removeLabel}</TooltipContent>
      </Tooltip>
      {children}
    </div>
  );
};

export default Tag;
