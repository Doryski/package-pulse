import { TableHead } from "@/components/ui/table";
import { cn } from "@/lib/utils/cn";
import { memo, PropsWithChildren } from "react";

export type SortColumn =
  | "projectName"
  | "weekly"
  | "monthly"
  | "yearly"
  | "oneYearAgo";
export type SortDirection = "asc" | "desc";

type TableHeadSortableProps = PropsWithChildren<
  {
    column: SortColumn;
    handleSort: (column: SortColumn) => void;
    isSorted: boolean;
    sortDirection: SortDirection;
    contentClassName?: string;
  } & React.ThHTMLAttributes<HTMLTableCellElement>
>;

const TableHeadSortable = memo(
  ({
    column,
    children,
    handleSort,
    isSorted,
    sortDirection,
    contentClassName,
    ...props
  }: TableHeadSortableProps) => {
    return (
      <TableHead
        className={cn(
          "cursor-pointer bg-slate-100 dark:bg-slate-900",
          props.className,
        )}
        onClick={() => handleSort(column)}
        {...props}
      >
        <div
          className={cn(
            "flex items-center justify-center gap-2 text-xs md:text-sm",
            contentClassName,
          )}
        >
          {children}
          <span className="text-[10px] md:text-xs">
            {isSorted && (sortDirection === "desc" ? "▼" : "▲")}
          </span>
        </div>
      </TableHead>
    );
  },
);

TableHeadSortable.displayName = "SortableTableHead";

export default TableHeadSortable;
