import { downloadFile } from "@/lib/utils/downloadFile";

export const exportJson = (filename: string, data: unknown[]) => {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  downloadFile(`${filename}.json`, blob);
};

export const exportCsv = async (filename: string, data: unknown[]) => {
  if (!data || data.length === 0) {
    console.warn("No data provided for CSV export");
    return;
  }

  const { unparse } = await import("papaparse");
  const csvContent = unparse(data, {
    header: true,
    skipEmptyLines: true,
    escapeFormulae: true,
  });

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  downloadFile(`${filename}.csv`, blob);
};
