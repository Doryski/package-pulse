type Waiter<V> = {
  key: string;
  resolve: (value: V) => void;
  reject: (error: unknown) => void;
};

export type BatchLoader<V> = {
  load: (key: string) => Promise<V>;
  release: (key: string) => void;
};

export function createBatchLoader<V extends NonNullable<unknown> | null>(
  expectedKeys: number,
  loadMany: (keys: string[]) => Promise<ReadonlyMap<string, V>>,
): BatchLoader<V> {
  const loaded = new Set<string>();
  const released = new Set<string>();
  let pending: Waiter<V>[] = [];

  const settleWith = (waiters: Waiter<V>[], values: ReadonlyMap<string, V>) =>
    waiters.forEach(({ key, resolve, reject }) => {
      const value = values.get(key);
      if (value === undefined) {
        reject(new Error(`Batch result missing for "${key}"`));
        return;
      }
      resolve(value);
    });

  const flush = () => {
    const waiters = pending;
    pending = [];
    loadMany(waiters.map(({ key }) => key)).then(
      (values) => settleWith(waiters, values),
      (error: unknown) => waiters.forEach(({ reject }) => reject(error)),
    );
  };

  const flushWhenReady = () => {
    if (pending.length === 0) return;
    if (loaded.size + released.size < expectedKeys) return;
    flush();
  };

  const load = (key: string) =>
    new Promise<V>((resolve, reject) => {
      loaded.add(key);
      released.delete(key);
      pending.push({ key, resolve, reject });
      flushWhenReady();
    });

  const release = (key: string) => {
    if (loaded.has(key)) return;
    released.add(key);
    flushWhenReady();
  };

  return { load, release };
}
