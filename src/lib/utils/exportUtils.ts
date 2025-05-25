import * as Papa from "papaparse";
import * as XLSX from "xlsx";

export const downloadFile = (filename: string, blob: Blob) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const exportJson = (filename: string, data: any[]) => {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  downloadFile(`${filename}.json`, blob);
};

export const exportCsv = (filename: string, data: any[]) => {
  if (!data || data.length === 0) {
    console.warn("No data provided for CSV export");
    return;
  }

  const csvContent = Papa.unparse(data, {
    header: true,
    skipEmptyLines: true,
  });

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  downloadFile(`${filename}.csv`, blob);
};

export const exportExcel = (filename: string, data: any[]) => {
  if (!data || data.length === 0) {
    console.warn("No data provided for Excel export");
    return;
  }

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");

  const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  const blob = new Blob([excelBuffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  downloadFile(`${filename}.xlsx`, blob);
};
