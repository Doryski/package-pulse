import { cn } from "@/lib/utils/cn";
import { Cross1Icon } from "@radix-ui/react-icons";

type TagProps = {
  children: React.ReactNode;
  onRemove: () => void;
} & React.HTMLAttributes<HTMLDivElement>;

const Tag = ({ children, onRemove, ...props }: TagProps) => {
  return (
    <div
      {...props}
      className={cn(
        `flex gap-2 items-center px-2 py-1 bg-accent
      text-sm text-accent-foreground rounded-md`,
        props.className,
      )}
    >
      <Cross1Icon className="h-3 w-3 cursor-pointer" onClick={onRemove} />
      {children}
    </div>
  );
};

export default Tag;
