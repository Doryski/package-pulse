import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  getLineChartStore,
  useHiddenElements,
  useIsHiddenElement,
  useToggleElement,
} from "./line-chart-store";

let keyCounter = 0;

const nextChartKey = () => {
  keyCounter += 1;
  return `store-test-${keyCounter}`;
};

const countRenders = <TResult>(hook: () => TResult) => {
  const counter = { renders: 0 };
  const result = renderHook(() => {
    counter.renders += 1;
    return hook();
  });
  return { ...result, counter };
};

describe("getLineChartStore", () => {
  it("returns the same store for the same key", () => {
    expect(getLineChartStore("same-key")).toBe(getLineChartStore("same-key"));
    expect(getLineChartStore("same-key")).not.toBe(
      getLineChartStore("other-key"),
    );
  });

  it("toggles an element on and off", () => {
    const store = getLineChartStore(nextChartKey());
    store.getState().toggleElement("react");
    expect(store.getState().hiddenElements.has("react")).toBe(true);
    store.getState().toggleElement("react");
    expect(store.getState().hiddenElements.has("react")).toBe(false);
  });

  it("does not expose a config", () => {
    const store = getLineChartStore(nextChartKey());
    expect(store.getState()).not.toHaveProperty("config");
    expect(store.getState()).not.toHaveProperty("setConfig");
  });
});

describe("selector hooks", () => {
  it("reports hidden state per key", () => {
    const chartKey = nextChartKey();
    const { result } = renderHook(() => ({
      react: useIsHiddenElement(chartKey, "react"),
      hidden: useHiddenElements(chartKey),
    }));
    act(() => getLineChartStore(chartKey).getState().toggleElement("react"));
    expect(result.current.react).toBe(true);
    expect([...result.current.hidden]).toEqual(["react"]);
  });

  it("does not re-render a consumer of another key", () => {
    const chartKey = nextChartKey();
    const { counter, result } = countRenders(() =>
      useIsHiddenElement(chartKey, "vue"),
    );
    act(() => getLineChartStore(chartKey).getState().toggleElement("react"));
    expect(result.current).toBe(false);
    expect(counter.renders).toBe(1);
  });

  it("does not re-render a toggle-only consumer", () => {
    const chartKey = nextChartKey();
    const { counter, result } = countRenders(() => useToggleElement(chartKey));
    act(() => result.current("react"));
    expect(
      getLineChartStore(chartKey).getState().hiddenElements.has("react"),
    ).toBe(true);
    expect(counter.renders).toBe(1);
  });
});
