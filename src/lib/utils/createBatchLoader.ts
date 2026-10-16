import { SELECTED_PROJECTS_LIMIT } from "@/lib/config/constants";

export type BatchReader<V> = (key: string) => V;

export type LoadBatch<V> = (
  keys: string[],
  signal: AbortSignal,
) => Promise<BatchReader<V>>;

type BatchLoaderOptions<V> = {
  loadBatch: LoadBatch<V>;
  maxBatchSize?: number;
};

type Waiter<V> = {
  resolve: (value: V) => void;
  reject: (error: unknown) => void;
  detach: () => void;
};

type Batch<V> = {
  waiters: Map<string, Set<Waiter<V>>>;
  controller: AbortController;
  activeWaiters: number;
  dispatched: boolean;
};

export const createAbortError = () =>
  new DOMException("The operation was aborted.", "AbortError");

const createBatch = <V>(): Batch<V> => ({
  waiters: new Map(),
  controller: new AbortController(),
  activeWaiters: 0,
  dispatched: false,
});

const settleWaiters = <V>(
  waiters: Set<Waiter<V>>,
  settle: (waiter: Waiter<V>) => void,
) => {
  waiters.forEach((waiter) => {
    waiter.detach();
    settle(waiter);
  });
};

const readInto = <V>(read: BatchReader<V>, key: string) => {
  return (waiter: Waiter<V>) => {
    try {
      waiter.resolve(read(key));
    } catch (error) {
      waiter.reject(error);
    }
  };
};

export default function createBatchLoader<V>({
  loadBatch,
  maxBatchSize = SELECTED_PROJECTS_LIMIT,
}: BatchLoaderOptions<V>) {
  const inFlight = new Map<string, Batch<V>>();
  let pending: Batch<V> | undefined;

  const releaseInFlight = (batch: Batch<V>) => {
    batch.waiters.forEach((_, key) => {
      if (inFlight.get(key) === batch) inFlight.delete(key);
    });
  };

  const resolveBatch = (batch: Batch<V>, read: BatchReader<V>) => {
    batch.waiters.forEach((waiters, key) =>
      settleWaiters(waiters, readInto(read, key)),
    );
  };

  const rejectBatch = (batch: Batch<V>, error: unknown) => {
    batch.waiters.forEach((waiters) =>
      settleWaiters(waiters, (waiter) => waiter.reject(error)),
    );
  };

  const dispatch = (batch: Batch<V>) => {
    if (batch.dispatched) return;
    batch.dispatched = true;
    if (pending === batch) pending = undefined;
    const keys = [...batch.waiters.keys()];
    if (keys.length === 0) return;
    keys.forEach((key) => inFlight.set(key, batch));
    loadBatch(keys, batch.controller.signal).then(
      (read) => {
        releaseInFlight(batch);
        resolveBatch(batch, read);
      },
      (error) => {
        releaseInFlight(batch);
        rejectBatch(batch, error);
      },
    );
  };

  const openPendingBatch = () => {
    const batch = createBatch<V>();
    pending = batch;
    queueMicrotask(() => dispatch(batch));
    return batch;
  };

  const findBatch = (key: string) => {
    const running = inFlight.get(key);
    if (running) return running;
    if (pending?.waiters.has(key)) return pending;
    const batch = pending ?? openPendingBatch();
    batch.waiters.set(key, new Set());
    if (batch.waiters.size >= maxBatchSize) dispatch(batch);
    return batch;
  };

  const removeWaiter = (batch: Batch<V>, key: string, waiter: Waiter<V>) => {
    const waiters = batch.waiters.get(key);
    waiters?.delete(waiter);
    batch.activeWaiters -= 1;
    if (!batch.dispatched && waiters?.size === 0) batch.waiters.delete(key);
    if (!batch.dispatched || batch.activeWaiters > 0) return;
    releaseInFlight(batch);
    batch.controller.abort();
  };

  const load = (key: string, signal?: AbortSignal) =>
    new Promise<V>((resolve, reject) => {
      if (signal?.aborted) {
        reject(createAbortError());
        return;
      }
      const batch = findBatch(key);
      const onAbort = () => {
        removeWaiter(batch, key, waiter);
        reject(createAbortError());
      };
      const waiter: Waiter<V> = {
        resolve,
        reject,
        detach: () => signal?.removeEventListener("abort", onAbort),
      };
      batch.waiters.get(key)?.add(waiter);
      batch.activeWaiters += 1;
      signal?.addEventListener("abort", onAbort, { once: true });
    });

  return { load };
}
