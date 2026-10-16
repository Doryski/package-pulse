import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

const { html2canvas, downloadFile, toast } = vi.hoisted(() => ({
  html2canvas: vi.fn(),
  downloadFile: vi.fn(),
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("html2canvas-pro", () => ({ default: html2canvas }));
vi.mock("@/lib/utils/downloadFile", () => ({ downloadFile }));
vi.mock("sonner", () => ({ toast }));

import {
  convertHtmlToImage,
  copyAsImage,
  downloadAsImage,
  STYLESHEET_TIMEOUT_MS,
  waitForStylesheets,
} from "./imageExport";

const element = document.createElement("div");
const write = vi.fn();

const makeCanvas = (blob: Blob | null, width = 200, height = 100) => ({
  width,
  height,
  toDataURL: vi.fn(() => "data:image/png;base64,AAA"),
  toBlob: vi.fn((callback: (blob: Blob | null) => void | Promise<void>) =>
    callback(blob),
  ),
});

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

const createDocumentWithLinks = (count: number) => {
  const doc = document.implementation.createHTMLDocument();
  const links = Array.from({ length: count }, (_, index) => {
    const link = doc.createElement("link");
    link.rel = "stylesheet";
    link.href = `/styles-${index}.css`;
    doc.head.append(link);
    return link;
  });
  return { doc, links };
};

const markLoaded = (link: HTMLLinkElement) =>
  Object.defineProperty(link, "sheet", {
    value: {} as CSSStyleSheet,
    configurable: true,
  });

const trackSettled = (promise: Promise<void>) => {
  const state = { settled: false };
  void promise.then(() => {
    state.settled = true;
  });
  return state;
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  write.mockResolvedValue(undefined);
  vi.stubGlobal(
    "ClipboardItem",
    class {
      constructor(public items: Record<string, Blob>) {}
    },
  );
  Object.defineProperty(navigator, "clipboard", {
    value: { write },
    configurable: true,
  });
});

describe("convertHtmlToImage", () => {
  test("renders element with html2canvas options", async () => {
    const canvas = makeCanvas(null);
    html2canvas.mockResolvedValue(canvas);

    const result = await convertHtmlToImage(element);

    expect(result).toBe(canvas);
    expect(html2canvas).toHaveBeenCalledWith(element, {
      backgroundColor: "transparent",
      scale: 2,
      useCORS: true,
      allowTaint: true,
      onclone: expect.any(Function),
    });
  });

  test("onclone waits for pending stylesheets in the cloned document", async () => {
    html2canvas.mockResolvedValue(makeCanvas(null));
    await convertHtmlToImage(element);
    const { onclone } = html2canvas.mock.calls[0]![1];
    const { doc, links } = createDocumentWithLinks(2);

    const state = trackSettled(onclone(doc));
    links[0]!.dispatchEvent(new Event("load"));
    await flush();

    expect(state.settled).toBe(false);

    links[1]!.dispatchEvent(new Event("load"));
    await flush();

    expect(state.settled).toBe(true);
  });

  test("throws AppError when rendered canvas has zero height", async () => {
    html2canvas.mockResolvedValue(makeCanvas(null, 2528, 0));

    await expect(convertHtmlToImage(element)).rejects.toMatchObject({
      name: "AppError",
      message: "Rendered image is empty (2528x0)",
    });
  });

  test("throws AppError when rendered canvas has zero width", async () => {
    html2canvas.mockResolvedValue(makeCanvas(null, 0, 100));

    await expect(convertHtmlToImage(element)).rejects.toMatchObject({
      name: "AppError",
    });
  });
});

describe("waitForStylesheets", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  test("resolves when there are no stylesheets", async () => {
    const { doc } = createDocumentWithLinks(0);

    await expect(waitForStylesheets(doc)).resolves.toBeUndefined();
  });

  test("resolves immediately for already-loaded stylesheets", async () => {
    const { doc, links } = createDocumentWithLinks(1);
    markLoaded(links[0]!);

    const state = trackSettled(waitForStylesheets(doc));
    await flush();

    expect(state.settled).toBe(true);
  });

  test("resolves when a stylesheet errors", async () => {
    const { doc, links } = createDocumentWithLinks(1);

    const state = trackSettled(waitForStylesheets(doc));
    await flush();
    expect(state.settled).toBe(false);

    links[0]!.dispatchEvent(new Event("error"));
    await flush();

    expect(state.settled).toBe(true);
  });

  test("ignores non-stylesheet links", async () => {
    const { doc } = createDocumentWithLinks(0);
    const icon = doc.createElement("link");
    icon.rel = "icon";
    doc.head.append(icon);

    const state = trackSettled(waitForStylesheets(doc));
    await flush();

    expect(state.settled).toBe(true);
  });

  test("resolves after the timeout when a stylesheet never loads", async () => {
    vi.useFakeTimers();
    const { doc } = createDocumentWithLinks(1);

    const state = trackSettled(waitForStylesheets(doc));
    await vi.advanceTimersByTimeAsync(STYLESHEET_TIMEOUT_MS - 1);

    expect(state.settled).toBe(false);

    await vi.advanceTimersByTimeAsync(1);

    expect(state.settled).toBe(true);
  });

  test("respects a custom timeout", async () => {
    vi.useFakeTimers();
    const { doc } = createDocumentWithLinks(1);

    const state = trackSettled(waitForStylesheets(doc, 100));
    await vi.advanceTimersByTimeAsync(100);

    expect(state.settled).toBe(true);
  });
});

describe("downloadAsImage", () => {
  test("downloads png and shows success toast with default label", async () => {
    html2canvas.mockResolvedValue(makeCanvas(null));

    await downloadAsImage(element, "chart");

    expect(downloadFile).toHaveBeenCalledWith(
      "chart.png",
      "data:image/png;base64,AAA",
    );
    expect(toast.success).toHaveBeenCalledWith("Widget downloaded as image");
  });

  test("uses custom label", async () => {
    html2canvas.mockResolvedValue(makeCanvas(null));

    await downloadAsImage(element, "chart", "Chart");

    expect(toast.success).toHaveBeenCalledWith("Chart downloaded as image");
  });

  test("shows error toast when rendering fails", async () => {
    html2canvas.mockRejectedValue(new Error("fail"));

    await downloadAsImage(element, "chart", "Chart");

    expect(downloadFile).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith("Failed to download chart");
  });

  test("shows error toast and skips download when canvas is empty", async () => {
    const canvas = makeCanvas(null, 2528, 0);
    html2canvas.mockResolvedValue(canvas);

    await downloadAsImage(element, "chart", "Chart");

    expect(canvas.toDataURL).not.toHaveBeenCalled();
    expect(downloadFile).not.toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith("Failed to download chart");
    expect(console.error).toHaveBeenCalledWith(
      "Error downloading chart:",
      expect.objectContaining({ name: "AppError" }),
    );
  });
});

describe("copyAsImage", () => {
  test("writes png blob to clipboard and shows success toast", async () => {
    const blob = new Blob(["x"], { type: "image/png" });
    html2canvas.mockResolvedValue(makeCanvas(blob));

    await copyAsImage(element);
    await flush();

    expect(write).toHaveBeenCalledTimes(1);
    const [items] = write.mock.calls[0]!;
    expect(items[0].items).toEqual({ "image/png": blob });
    expect(toast.success).toHaveBeenCalledWith("Widget copied to clipboard");
  });

  test("shows error toast when blob is null", async () => {
    html2canvas.mockResolvedValue(makeCanvas(null));

    await copyAsImage(element);
    await flush();

    expect(write).not.toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith("Failed to copy widget");
  });

  test("shows error toast when clipboard write fails", async () => {
    write.mockRejectedValue(new Error("denied"));
    html2canvas.mockResolvedValue(makeCanvas(new Blob(["x"])));

    await copyAsImage(element, "Chart");
    await flush();

    expect(toast.error).toHaveBeenCalledWith("Failed to copy chart");
  });

  test("shows error toast when rendering fails", async () => {
    html2canvas.mockRejectedValue(new Error("fail"));

    await copyAsImage(element, "Chart");

    expect(toast.error).toHaveBeenCalledWith("Failed to copy chart");
  });

  test("shows error toast and skips clipboard when canvas is empty", async () => {
    const canvas = makeCanvas(new Blob(["x"]), 0, 0);
    html2canvas.mockResolvedValue(canvas);

    await copyAsImage(element, "Chart");
    await flush();

    expect(canvas.toBlob).not.toHaveBeenCalled();
    expect(write).not.toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith("Failed to copy chart");
    expect(console.error).toHaveBeenCalledWith(
      "Error copying chart:",
      expect.objectContaining({ name: "AppError" }),
    );
  });
});
