import { StatChange } from "@/app/(home)/utils/getStatsMatrix";
import formatCellValue from "@/lib/utils/formatCellValue";
import formatInteger from "@/lib/utils/formatInteger";
import formatPercentage from "@/lib/utils/formatPercentage";
import { memo } from "react";
import ArrowIndicator from "./arrow-indicator";
import { TableCell } from "./table";

type TableCellWithStatsProps = {
  change: StatChange | null;
};

const TableCellWithStats = memo(({ change }: TableCellWithStatsProps) => (
  <TableCell className="table-cell text-center">
    <div className="flex items-center justify-center gap-2">
      <div className="flex flex-col">
        <span data-value-type="nominal">
          {formatCellValue(change?.nominal, formatInteger)}
        </span>
        <span data-value-type="percentage">
          {formatCellValue(change?.percentage, formatPercentage)}
        </span>
      </div>
      <ArrowIndicator value={change?.nominal} />
    </div>
  </TableCell>
));

TableCellWithStats.displayName = "TableCellWithStats";

export default TableCellWithStats;
