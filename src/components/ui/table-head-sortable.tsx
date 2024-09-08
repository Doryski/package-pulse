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
  } & React.ThHTMLAttributes<HTMLTableCellElement>
>;

const TableHeadSortable = memo(
  ({
    column,
    children,
    handleSort,
    isSorted,
    sortDirection,
    ...props
  }: TableHeadSortableProps) => {
    return (
      <TableHead
        className={cn("text-center cursor-pointer", props.className)}
        onClick={() => handleSort(column)}
        {...props}
      >
        <div className="flex items-center justify-center gap-2">
          {children}
          <span className="text-sm">
            {isSorted && (sortDirection === "desc" ? "▼" : "▲")}
          </span>
        </div>
      </TableHead>
    );
  },
);

TableHeadSortable.displayName = "SortableTableHead";

export default TableHeadSortable;
