import { describe, expect, test } from "vitest";
import safeExternalUrl from "./safeExternalUrl";

describe("safeExternalUrl", () => {
  test.each([
    ["https://react.dev", "https://react.dev/"],
    ["http://example.com/docs", "http://example.com/docs"],
    [
      "git+https://github.com/facebook/react.git",
      "https://github.com/facebook/react",
    ],
    ["git://github.com/user/repo.git", "https://github.com/user/repo"],
  ])("keeps safe url %s", (input, expected) => {
    expect(safeExternalUrl(input)).toBe(expected);
  });

  test.each([
    "javascript:alert(1)",
    " JavaScript:alert(document.domain)",
    "data:text/html,<script>alert(1)</script>",
    "vbscript:msgbox(1)",
    "not a url",
    "",
    null,
    undefined,
  ])("rejects unsafe or invalid url %s", (input) => {
    expect(safeExternalUrl(input)).toBeUndefined();
  });
});
