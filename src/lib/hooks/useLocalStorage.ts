import { useEffect } from "react";

function useLocalStorage<T>(key: string, value: T) {
  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);
}

export default useLocalStorage;
