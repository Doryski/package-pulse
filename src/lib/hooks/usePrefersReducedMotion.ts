import { useSyncExternalStore } from "react";

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

const getMediaQuery = () => window.matchMedia(REDUCED_MOTION_QUERY);

const subscribe = (onChange: () => void) => {
  const mediaQuery = getMediaQuery();
  mediaQuery.addEventListener("change", onChange);
  return () => mediaQuery.removeEventListener("change", onChange);
};

const getSnapshot = () => getMediaQuery().matches;

const getServerSnapshot = () => true;

export const usePrefersReducedMotion = () =>
  useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
