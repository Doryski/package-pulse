import LocalStorageKey from "@/lib/enums/LocalStorageKey";
import { renderHook } from "@testing-library/react";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const loadHook = async () => (await import("./useRestoredProjects")).default;

const storeSelection = (value: string) =>
  localStorage.setItem(LocalStorageKey.SELECTED_PROJECTS, value);

describe("useRestoredProjects", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetModules();
  });

  it("returns the stored selection on the client", async () => {
    storeSelection(JSON.stringify(["react", "vue"]));
    const useRestoredProjects = await loadHook();

    const { result } = renderHook(() => useRestoredProjects());

    expect(result.current).toEqual(["react", "vue"]);
  });

  it.each([
    ["nothing is stored", null],
    ["the value is not JSON", "{oops"],
    ["the value fails the schema", JSON.stringify([1, 2])],
  ])("returns an empty list when %s", async (_, value) => {
    if (value !== null) storeSelection(value);
    const useRestoredProjects = await loadHook();

    const { result } = renderHook(() => useRestoredProjects());

    expect(result.current).toEqual([]);
  });

  it("returns null from the server snapshot", async () => {
    storeSelection(JSON.stringify(["react"]));
    const useRestoredProjects = await loadHook();
    const Probe = () => JSON.stringify(useRestoredProjects());

    expect(renderToString(createElement(Probe))).toBe("null");
  });

  it("keeps the restored snapshot stable while mounted", async () => {
    storeSelection(JSON.stringify(["react"]));
    const useRestoredProjects = await loadHook();
    const { result, rerender } = renderHook(() => useRestoredProjects());
    const first = result.current;

    storeSelection(JSON.stringify(["vue"]));
    rerender();

    expect(result.current).toBe(first);
  });

  it("re-reads storage after every consumer unmounts", async () => {
    storeSelection(JSON.stringify(["react"]));
    const useRestoredProjects = await loadHook();
    renderHook(() => useRestoredProjects()).unmount();

    storeSelection(JSON.stringify(["vue"]));
    const { result } = renderHook(() => useRestoredProjects());

    expect(result.current).toEqual(["vue"]);
  });
});
