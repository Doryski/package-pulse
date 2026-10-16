import Loader from "@/components/loader";
import DotIndicator, { DotIndicatorProps } from "@/components/ui/dot-indicator";
import { Skeleton } from "@/components/ui/skeleton";
import { TableCell } from "@/components/ui/table";
import { cn } from "@/lib/utils/cn";
import type { ReactNode } from "react";

export const STICKY_NAME_CELL_CLASS_NAME =
  "sticky left-0 z-10 table-cell bg-background";

type ProjectNameCellProps = {
  isLoading?: boolean;
  projectName: string;
  className?: string;
  title?: string;
  children?: ReactNode;
} & DotIndicatorProps;

export function ProjectNameCell({
  isLoading = false,
  projectName,
  className,
  title,
  children,
  ...dotIndicatorProps
}: ProjectNameCellProps) {
  return (
    <TableCell
      className={cn(STICKY_NAME_CELL_CLASS_NAME, className)}
      title={title}
    >
      <Loader
        isLoading={isLoading}
        fallback={<Skeleton aria-hidden className="h-4 w-full" />}
      >
        <div className="flex items-center gap-2">
          <DotIndicator {...dotIndicatorProps} />
          <span>{projectName}</span>
          {children}
        </div>
      </Loader>
    </TableCell>
  );
}
