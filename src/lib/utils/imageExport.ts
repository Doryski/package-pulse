import AppError from "@/lib/utils/AppError";
import { downloadFile } from "@/lib/utils/exportUtils";
import { toast } from "sonner";

export const STYLESHEET_TIMEOUT_MS = 5_000;

const waitForStylesheet = (link: HTMLLinkElement) =>
  new Promise<void>((resolve) => {
    if (link.sheet) {
      resolve();
      return;
    }
    link.addEventListener("load", () => resolve(), { once: true });
    link.addEventListener("error", () => resolve(), { once: true });
  });

const withTimeout = (promise: Promise<unknown>, timeoutMs: number) =>
  new Promise<void>((resolve) => {
    const timer = setTimeout(resolve, timeoutMs);
    void promise.then(() => {
      clearTimeout(timer);
      resolve();
    });
  });

const getStylesheetLinks = (document: Document) => [
  ...document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]'),
];

export const waitForStylesheets = (
  document: Document,
  timeoutMs = STYLESHEET_TIMEOUT_MS,
) =>
  withTimeout(
    Promise.all(getStylesheetLinks(document).map(waitForStylesheet)),
    timeoutMs,
  );

const isEmptyCanvas = (canvas: HTMLCanvasElement) =>
  canvas.width === 0 || canvas.height === 0;

const assertCanvasHasSize = (canvas: HTMLCanvasElement) => {
  if (!isEmptyCanvas(canvas)) return;
  throw new AppError(
    `Rendered image is empty (${canvas.width}x${canvas.height})`,
  );
};

export async function convertHtmlToImage(element: HTMLElement) {
  const html2canvas = (await import("html2canvas-pro")).default;

  const canvas = await html2canvas(element, {
    backgroundColor: "transparent",
    scale: 2,
    useCORS: true,
    allowTaint: true,
    onclone: (clonedDocument) => waitForStylesheets(clonedDocument),
  });

  assertCanvasHasSize(canvas);
  return canvas;
}

export const downloadAsImage = async (
  element: HTMLElement,
  filename: string,
  label = "Widget",
) => {
  try {
    const canvas = await convertHtmlToImage(element);

    downloadFile(`${filename}.png`, canvas.toDataURL());

    toast.success(`${label} downloaded as image`);
  } catch (error) {
    console.error(`Error downloading ${label.toLowerCase()}:`, error);
    toast.error(`Failed to download ${label.toLowerCase()}`);
  }
};

export const copyAsImage = async (element: HTMLElement, label = "Widget") => {
  try {
    const canvas = await convertHtmlToImage(element);

    canvas.toBlob(async (blob: Blob | null) => {
      if (!blob) {
        toast.error(`Failed to copy ${label.toLowerCase()}`);
        return;
      }
      try {
        await navigator.clipboard.write([
          new ClipboardItem({ "image/png": blob }),
        ]);
        toast.success(`${label} copied to clipboard`);
      } catch (error) {
        console.error("Error copying to clipboard:", error);
        toast.error(`Failed to copy ${label.toLowerCase()}`);
      }
    });
  } catch (error) {
    console.error(`Error copying ${label.toLowerCase()}:`, error);
    toast.error(`Failed to copy ${label.toLowerCase()}`);
  }
};
