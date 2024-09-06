import formatCellValue from "@/lib/utils/formatCellValue";
import formatInteger from "@/lib/utils/formatNominal";
import formatPercentage from "@/lib/utils/formatPercentage";
import { StatChange } from "@/lib/utils/getStatsMatrix";
import { memo } from "react";
import ArrowIndicator from "./ui/arrow-indicator";
import { TableCell } from "./ui/table";

type TableCellWithStatsProps = {
  change: StatChange | null;
};

const TableCellWithStats = memo(({ change }: TableCellWithStatsProps) => (
  <TableCell className="table-cell text-center">
    <div className="flex items-center justify-center gap-2">
      <div className="flex flex-col">
        <span>{formatCellValue(change?.nominal, formatInteger)}</span>
        <span>{formatCellValue(change?.percentage, formatPercentage)}</span>
      </div>
      <ArrowIndicator value={change?.nominal} />
    </div>
  </TableCell>
));

TableCellWithStats.displayName = "TableCellWithStats";

export default TableCellWithStats;
