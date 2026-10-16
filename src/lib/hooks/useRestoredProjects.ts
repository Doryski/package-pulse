import { useSyncExternalStore } from "react";
import * as z from "zod/mini";

import LocalStorageKey from "@/lib/enums/LocalStorageKey";
import getLocalStorageValue from "@/lib/utils/getLocalStorageValue";

const restoredProjectsSchema = z.array(z.string());

const EMPTY: string[] = [];

const listeners = new Set<() => void>();

let restoredProjects: string[] | null = null;

const readFromStorage = () =>
  getLocalStorageValue(
    LocalStorageKey.SELECTED_PROJECTS,
    restoredProjectsSchema,
  ) ?? EMPTY;

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) restoredProjects = null;
  };
};

const getSnapshot = () => {
  restoredProjects ??= readFromStorage();
  return restoredProjects;
};

const getServerSnapshot = () => null;

function useRestoredProjects() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export default useRestoredProjects;
