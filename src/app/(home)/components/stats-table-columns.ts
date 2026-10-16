export const STICKY_HEAD_CLASS_NAME =
  "sticky left-0 z-20 w-25 min-w-25 bg-slate-100 md:w-50 md:min-w-[150px] dark:bg-slate-900";

export const statsTableColumns = [
  { column: "projectName", label: "Project name", isSticky: true },
  { column: "weekly", label: "Weekly", isSticky: false },
  { column: "monthly", label: "Monthly", isSticky: false },
  { column: "yearly", label: "Yearly", isSticky: false },
  { column: "yoyWeek", label: "YoY Week", isSticky: false },
  { column: "yoyMonth", label: "YoY Month", isSticky: false },
  { column: "vibeCodingEra", label: "Vibe Coding Era", isSticky: false },
  { column: "breakDrop", label: "Break Drop", isSticky: false },
] as const;

export type StatsTableColumnKey = (typeof statsTableColumns)[number]["column"];

export const statsColumnLabel = (column: StatsTableColumnKey) =>
  statsTableColumns.find((entry) => entry.column === column)?.label ?? column;
