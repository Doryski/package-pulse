import { TableHead } from "@/components/ui/table";
import { cn } from "@/lib/utils/cn";
import { PropsWithChildren } from "react";

export type SortColumn =
  | "projectName"
  | "weekly"
  | "monthly"
  | "yearly"
  | "oneYearAgo";
export type SortDirection = "asc" | "desc";

type SortableTableHeadProps = PropsWithChildren<
  {
    column: SortColumn;
    handleSort: (column: SortColumn) => void;
    isSorted: boolean;
    sortDirection: SortDirection;
  } & React.ThHTMLAttributes<HTMLTableCellElement>
>;

const SortableTableHead = ({
  column,
  children,
  handleSort,
  isSorted,
  sortDirection,
  ...props
}: SortableTableHeadProps) => {
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
};

export default SortableTableHead;
