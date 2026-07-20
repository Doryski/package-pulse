import { useSyncExternalStore } from "react";
import { z } from "zod";

import LocalStorageKey from "@/lib/enums/LocalStorageKey";
import getLocalStorageValue from "@/lib/utils/getLocalStorageValue";

const favoritesSchema = z.array(z.array(z.string()));

const toCanonicalKey = (projects: string[]) => [...projects].sort().join(" ");

const EMPTY: string[][] = [];

const listeners = new Set<() => void>();

let favorites: string[][] = EMPTY;
let initialized = false;

const readFromStorage = () =>
  getLocalStorageValue(LocalStorageKey.FAVORITES, favoritesSchema) ?? EMPTY;

const ensureInitialized = () => {
  if (initialized || typeof window === "undefined") return;
  favorites = readFromStorage();
  initialized = true;
};

const notify = () => listeners.forEach((listener) => listener());

const persist = () => {
  if (typeof window === "undefined") return;
  localStorage.setItem(LocalStorageKey.FAVORITES, JSON.stringify(favorites));
};

const setFavorites = (next: string[][]) => {
  favorites = next;
  persist();
  notify();
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

const getSnapshot = () => {
  ensureInitialized();
  return favorites;
};

const getServerSnapshot = () => EMPTY;

const hasFavorite = (projects: string[]) => {
  const key = toCanonicalKey(projects);
  return favorites.some((entry) => toCanonicalKey(entry) === key);
};

const addFavorite = (projects: string[]) => {
  ensureInitialized();
  if (hasFavorite(projects)) return;
  setFavorites([...favorites, projects]);
};

const removeFavorite = (projects: string[]) => {
  ensureInitialized();
  const key = toCanonicalKey(projects);
  const next = favorites.filter((entry) => toCanonicalKey(entry) !== key);
  if (next.length === favorites.length) return;
  setFavorites(next);
};

const toggleFavorite = (projects: string[]) => {
  ensureInitialized();
  if (hasFavorite(projects)) {
    removeFavorite(projects);
    return;
  }
  addFavorite(projects);
};

const isFavorite = (projects: string[]) => hasFavorite(projects);

if (typeof window !== "undefined") {
  window.addEventListener("storage", (event) => {
    if (event.key !== null && event.key !== LocalStorageKey.FAVORITES) return;
    favorites = readFromStorage();
    initialized = true;
    notify();
  });
}

function useFavorites() {
  const favoritesSnapshot = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  return {
    favorites: favoritesSnapshot,
    addFavorite,
    removeFavorite,
    toggleFavorite,
    isFavorite,
  };
}

export default useFavorites;
