import { PropsWithChildren, useSyncExternalStore } from "react";

const subscribe = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

const ClientOnly = ({ children }: PropsWithChildren) => {
  const isMounted = useSyncExternalStore(
    subscribe,
    getClientSnapshot,
    getServerSnapshot,
  );

  return isMounted ? children : null;
};

export default ClientOnly;
