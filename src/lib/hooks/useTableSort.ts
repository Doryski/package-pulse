import {
  SortColumn,
  SortColumnSchema,
  SortDirection,
  SortDirectionSchema,
} from "@/components/ui/table-head-sortable";
import LocalStorageKey from "@/lib/enums/LocalStorageKey";
import useLocalStorage from "@/lib/hooks/useLocalStorage";
import getLocalStorageValue from "@/lib/utils/getLocalStorageValue";
import { useCallback, useEffect, useRef, useState } from "react";

export const TABLE_SORT_DEFAULT = {
  column: "yoyMonth",
  direction: "desc",
} as const satisfies { column: SortColumn; direction: SortDirection };

type TableSort = {
  column: SortColumn;
  direction: SortDirection;
};

const readStoredTableSort = (): TableSort => ({
  column:
    getLocalStorageValue(LocalStorageKey.TABLE_SORT_COLUMN, SortColumnSchema) ??
    TABLE_SORT_DEFAULT.column,
  direction:
    getLocalStorageValue(
      LocalStorageKey.TABLE_SORT_DIRECTION,
      SortDirectionSchema,
    ) ?? TABLE_SORT_DEFAULT.direction,
});

const toggleDirection = (direction: SortDirection) =>
  direction === "desc" ? "asc" : "desc";

export const getNextTableSort = (
  current: TableSort,
  column: SortColumn,
): TableSort => {
  if (column === current.column) {
    return { column, direction: toggleDirection(current.direction) };
  }
  return { column, direction: "desc" };
};

function useTableSort() {
  const [sort, setSort] = useState<TableSort>(TABLE_SORT_DEFAULT);
  const hasRestoredSort = useRef(false);

  useEffect(() => {
    if (hasRestoredSort.current) return;
    hasRestoredSort.current = true;
    setSort(readStoredTableSort());
  }, []);

  useLocalStorage(LocalStorageKey.TABLE_SORT_COLUMN, sort.column);
  useLocalStorage(LocalStorageKey.TABLE_SORT_DIRECTION, sort.direction);

  const handleSort = useCallback((column: SortColumn) => {
    setSort((current) => getNextTableSort(current, column));
  }, []);

  return {
    sortColumn: sort.column,
    sortDirection: sort.direction,
    handleSort,
  };
}

export default useTableSort;
