import { cn } from "@/lib/utils/cn";
import { Cross1Icon } from "@radix-ui/react-icons";
import { Button } from "./button";
import { Tooltip, TooltipContent, TooltipTrigger } from "./tooltip";

type TagProps = {
  children: React.ReactNode;
  onRemove: () => void;
  tooltipContent?: React.ReactNode;
} & React.HTMLAttributes<HTMLDivElement>;

const Tag = ({ children, onRemove, tooltipContent, ...props }: TagProps) => {
  return (
    <div
      {...props}
      className={cn(
        `flex gap-2 items-center px-2 py-1 bg-accent
      text-sm text-accent-foreground rounded-md`,
        props.className,
      )}
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="link" size="icon" onClick={onRemove}>
            <Cross1Icon />
          </Button>
        </TooltipTrigger>
        <TooltipContent>{tooltipContent ?? "Remove"}</TooltipContent>
      </Tooltip>
      {children}
    </div>
  );
};

export default Tag;
