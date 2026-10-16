import { useStore } from "zustand";
import { devtools } from "zustand/middleware";
import { createStore } from "zustand/vanilla";

type LineChartState = {
  hiddenElements: ReadonlySet<string>;
  toggleElement: (key: string) => void;
};

const toggleInSet = (set: ReadonlySet<string>, key: string) => {
  const next = new Set(set);
  if (next.has(key)) {
    next.delete(key);
    return next;
  }
  next.add(key);
  return next;
};

const createLineChartStore = (chartKey: string) =>
  createStore<LineChartState>()(
    devtools(
      (set) => ({
        hiddenElements: new Set<string>(),
        toggleElement: (key) =>
          set((state) => ({
            hiddenElements: toggleInSet(state.hiddenElements, key),
          })),
      }),
      {
        name: `line-chart-${chartKey}`,
        enabled: process.env.NODE_ENV === "development",
      },
    ),
  );

type LineChartStore = ReturnType<typeof createLineChartStore>;

const storeCache = new Map<string, LineChartStore>();

export const getLineChartStore = (chartKey: string) => {
  const cached = storeCache.get(chartKey);
  if (cached) return cached;
  const store = createLineChartStore(chartKey);
  storeCache.set(chartKey, store);
  return store;
};

const selectHiddenElements = (state: LineChartState) => state.hiddenElements;

const selectToggleElement = (state: LineChartState) => state.toggleElement;

export const useHiddenElements = (chartKey: string) =>
  useStore(getLineChartStore(chartKey), selectHiddenElements);

export const useIsHiddenElement = (chartKey: string, key: string) =>
  useStore(getLineChartStore(chartKey), (state) =>
    state.hiddenElements.has(key),
  );

export const useToggleElement = (chartKey: string) =>
  useStore(getLineChartStore(chartKey), selectToggleElement);
