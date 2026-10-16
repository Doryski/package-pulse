import { PropsWithChildren, ReactNode, useSyncExternalStore } from "react";

const subscribe = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

const ClientOnly = ({
  children,
  fallback = null,
}: PropsWithChildren<{ fallback?: ReactNode }>) => {
  const isMounted = useSyncExternalStore(
    subscribe,
    getClientSnapshot,
    getServerSnapshot,
  );

  return isMounted ? children : fallback;
};

export default ClientOnly;
