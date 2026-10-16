export const createFakeServerCache = () => {
  const store = new Map<string, unknown>();
  const cacheDerived =
    <A extends unknown[], R>(
      fn: (...args: A) => Promise<R>,
      keyParts: string[],
    ) =>
    async (...args: A): Promise<R> => {
      const key = JSON.stringify([keyParts, args]);
      if (store.has(key)) return store.get(key) as R;
      const value = await fn(...args);
      store.set(key, value);
      return value;
    };
  const clear = () => store.clear();
  return { cacheDerived, clear };
};
