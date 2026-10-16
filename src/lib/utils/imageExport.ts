import { downloadFile } from "@/lib/utils/exportUtils";
import { toast } from "sonner";

export async function convertHtmlToImage(element: HTMLElement) {
  const html2canvas = (await import("html2canvas")).default;

  return html2canvas(element, {
    backgroundColor: "transparent",
    scale: 2,
    useCORS: true,
    allowTaint: true,
  });
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
      if (blob) {
        try {
          await navigator.clipboard.write([
            new ClipboardItem({ "image/png": blob }),
          ]);
          toast.success(`${label} copied to clipboard`);
        } catch (error) {
          console.error("Error copying to clipboard:", error);
          toast.error(`Failed to copy ${label.toLowerCase()}`);
        }
      }
    });
  } catch (error) {
    console.error(`Error copying ${label.toLowerCase()}:`, error);
    toast.error(`Failed to copy ${label.toLowerCase()}`);
  }
};
