import { useCallback, useSyncExternalStore } from "react";

const DEFAULT_MOBILE_BREAKPOINT = 768;

const getMediaQuery = (breakpoint: number) =>
  window.matchMedia(`(max-width: ${breakpoint - 1}px)`);

const getServerSnapshot = () => undefined;

export const useIsMobile = (breakpoint = DEFAULT_MOBILE_BREAKPOINT) => {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const mediaQuery = getMediaQuery(breakpoint);
      mediaQuery.addEventListener("change", onChange);
      return () => mediaQuery.removeEventListener("change", onChange);
    },
    [breakpoint],
  );

  const getSnapshot = useCallback(
    () => getMediaQuery(breakpoint).matches,
    [breakpoint],
  );

  return useSyncExternalStore<boolean | undefined>(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );
};
