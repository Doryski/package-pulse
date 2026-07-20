import * as Papa from "papaparse";

export const downloadFile = (filename: string, blobOrUrl: Blob | string) => {
  const url =
    typeof blobOrUrl === "string" ? blobOrUrl : URL.createObjectURL(blobOrUrl);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const exportJson = (filename: string, data: unknown[]) => {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  downloadFile(`${filename}.json`, blob);
};

export const exportCsv = (filename: string, data: unknown[]) => {
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
