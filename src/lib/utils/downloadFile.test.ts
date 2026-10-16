import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { downloadFile } from "./downloadFile";

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
