import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { downloadFile, exportCsv, exportJson } from "./exportUtils";

const createObjectURL = vi.fn((_blob: Blob | MediaSource) => "blob:mock");
const revokeObjectURL = vi.fn();

type Click = { href: string; download: string };

let clicks: Click[];

beforeEach(() => {
  clicks = [];
  createObjectURL.mockClear();
  revokeObjectURL.mockClear();
  vi.stubGlobal(
    "URL",
    Object.assign(URL, { createObjectURL, revokeObjectURL }),
  );
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (
    this: HTMLAnchorElement,
  ) {
    clicks.push({ href: this.href, download: this.download });
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const readBlob = (blob: Blob) => blob.text();

describe("downloadFile", () => {
  test("uses string urls directly without creating an object url", () => {
    downloadFile("a.png", "data:image/png;base64,AAA");

    expect(createObjectURL).not.toHaveBeenCalled();
    expect(clicks).toEqual([
      { href: "data:image/png;base64,AAA", download: "a.png" },
    ]);
    expect(revokeObjectURL).toHaveBeenCalledWith("data:image/png;base64,AAA");
  });

  test("creates and revokes an object url for blobs", () => {
    const blob = new Blob(["x"]);

    downloadFile("a.txt", blob);

    expect(createObjectURL).toHaveBeenCalledWith(blob);
    expect(clicks).toEqual([{ href: "blob:mock", download: "a.txt" }]);
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:mock");
  });

  test("removes the temporary anchor from the document", () => {
    downloadFile("a.txt", "blob:x");

    expect(document.body.querySelector("a")).toBeNull();
  });
});

describe("exportJson", () => {
  test("downloads pretty printed json with .json extension", async () => {
    const data = [{ a: 1 }, { b: "x" }];

    exportJson("data", data);

    const blob = createObjectURL.mock.calls[0]![0] as Blob;
    expect(clicks[0]!.download).toBe("data.json");
    expect(blob.type).toBe("application/json");
    expect(await readBlob(blob)).toBe(JSON.stringify(data, null, 2));
  });
});

describe("exportCsv", () => {
  test("warns and skips download for empty data", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    exportCsv("data", []);

    expect(warn).toHaveBeenCalledWith("No data provided for CSV export");
    expect(createObjectURL).not.toHaveBeenCalled();
    expect(clicks).toEqual([]);
  });

  test("warns and skips download for nullish data", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    exportCsv("data", undefined as unknown as unknown[]);

    expect(warn).toHaveBeenCalled();
    expect(clicks).toEqual([]);
  });

  test("downloads csv with header row and .csv extension", async () => {
    exportCsv("data", [
      { name: "react", downloads: 10 },
      { name: "vue", downloads: 5 },
    ]);

    const blob = createObjectURL.mock.calls[0]![0] as Blob;
    expect(clicks[0]!.download).toBe("data.csv");
    expect(blob.type).toBe("text/csv;charset=utf-8;");
    expect(await readBlob(blob)).toBe("name,downloads\r\nreact,10\r\nvue,5");
  });

  test("escapes formula-leading cells", async () => {
    exportCsv("data", [{ name: "=SUM(A1)" }]);

    const blob = createObjectURL.mock.calls[0]![0] as Blob;
    expect(await readBlob(blob)).toBe('name\r\n"\'=SUM(A1)"');
  });
});
