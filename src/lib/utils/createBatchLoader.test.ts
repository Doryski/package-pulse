import { describe, expect, test, vi } from "vitest";
import createBatchLoader, { BatchReader, LoadBatch } from "./createBatchLoader";

type Deferred = {
  keys: string[];
  signal: AbortSignal;
  resolve: (read: BatchReader<string>) => void;
  reject: (error: unknown) => void;
};

const flushMicrotasks = () =>
  new Promise<void>((resolve) => setTimeout(resolve));

const upperCaseReader: BatchReader<string> = (key) => {
  if (key.startsWith("bad")) throw new Error(`bad key ${key}`);
  return key.toUpperCase();
};

const setup = (maxBatchSize?: number) => {
  const calls: Deferred[] = [];
  const loadBatch = vi.fn<LoadBatch<string>>(
    (keys, signal) =>
      new Promise((resolve, reject) => {
        calls.push({ keys, signal, resolve, reject });
        signal.addEventListener("abort", () =>
          reject(new DOMException("aborted", "AbortError")),
        );
      }),
  );
  const loader = createBatchLoader({ loadBatch, maxBatchSize });
  return { calls, loadBatch, loader };
};

const settledState = async (promise: Promise<unknown>) => {
  const marker = Symbol("pending");
  const result = await Promise.race([
    promise.then(
      () => "resolved",
      () => "rejected",
    ),
    flushMicrotasks().then(() => marker),
  ]);
  return result === marker ? "pending" : result;
};

describe("createBatchLoader", () => {
  test("merges keys requested in the same tick into one batch", async () => {
    const { calls, loader } = setup();

    const results = Promise.all([loader.load("b"), loader.load("a")]);
    await flushMicrotasks();
    calls[0]!.resolve(upperCaseReader);

    expect(calls.map((call) => call.keys)).toEqual([["b", "a"]]);
    await expect(results).resolves.toEqual(["B", "A"]);
  });

  test("dedupes a key that is queued or already in flight", async () => {
    const { calls, loader } = setup();

    const first = loader.load("a");
    const queuedDuplicate = loader.load("a");
    await flushMicrotasks();
    const inFlightDuplicate = loader.load("a");
    await flushMicrotasks();
    calls[0]!.resolve(upperCaseReader);

    expect(calls).toHaveLength(1);
    await expect(
      Promise.all([first, queuedDuplicate, inFlightDuplicate]),
    ).resolves.toEqual(["A", "A", "A"]);
  });

  test("requests a key again once its batch has settled", async () => {
    const { calls, loader } = setup();

    const first = loader.load("a");
    await flushMicrotasks();
    calls[0]!.resolve(upperCaseReader);
    await first;
    const second = loader.load("a");
    await flushMicrotasks();
    calls[1]!.resolve(upperCaseReader);

    expect(calls).toHaveLength(2);
    await expect(second).resolves.toBe("A");
  });

  test("only requests keys that are not already in flight", async () => {
    const { calls, loader } = setup();

    void loader.load("a");
    await flushMicrotasks();
    void loader.load("a");
    void loader.load("b");
    await flushMicrotasks();

    expect(calls.map((call) => call.keys)).toEqual([["a"], ["b"]]);
  });

  test("splits batches at the size cap", async () => {
    const { calls, loader } = setup(2);

    ["a", "b", "c"].forEach((key) => void loader.load(key));
    await flushMicrotasks();

    expect(calls.map((call) => call.keys)).toEqual([["a", "b"], ["c"]]);
  });

  test("rejects only the waiters whose key failed to read", async () => {
    const { calls, loader } = setup();

    const good = loader.load("ok");
    const bad = loader.load("bad-one");
    await flushMicrotasks();
    calls[0]!.resolve(upperCaseReader);

    await expect(good).resolves.toBe("OK");
    await expect(bad).rejects.toThrow("bad key bad-one");
  });

  test("rejects every waiter when the batch request fails", async () => {
    const { calls, loader } = setup();

    const results = [loader.load("a"), loader.load("b")];
    await flushMicrotasks();
    calls[0]!.reject(new Error("network"));

    await Promise.all(
      results.map((result) => expect(result).rejects.toThrow("network")),
    );
  });

  test("rejects immediately for an already aborted signal", async () => {
    const { loadBatch, loader } = setup();
    const controller = new AbortController();
    controller.abort();

    await expect(loader.load("a", controller.signal)).rejects.toMatchObject({
      name: "AbortError",
    });
    await flushMicrotasks();
    expect(loadBatch).not.toHaveBeenCalled();
  });

  test("drops a key aborted before the batch is dispatched", async () => {
    const { calls, loader } = setup();
    const controller = new AbortController();

    const aborted = loader.load("a", controller.signal);
    void loader.load("b");
    controller.abort();

    await expect(aborted).rejects.toMatchObject({ name: "AbortError" });
    await flushMicrotasks();
    expect(calls.map((call) => call.keys)).toEqual([["b"]]);
  });

  test("keeps the shared request alive while any waiter is still active", async () => {
    const { calls, loader } = setup();
    const first = new AbortController();
    const second = new AbortController();

    const abandoned = loader.load("a", first.signal);
    const kept = loader.load("a", second.signal);
    const other = loader.load("b");
    await flushMicrotasks();
    first.abort();

    await expect(abandoned).rejects.toMatchObject({ name: "AbortError" });
    expect(calls[0]!.signal.aborted).toBe(false);
    calls[0]!.resolve(upperCaseReader);
    await expect(Promise.all([kept, other])).resolves.toEqual(["A", "B"]);
  });

  test("aborts the shared request when every waiter aborted", async () => {
    const { calls, loader } = setup();
    const first = new AbortController();
    const second = new AbortController();

    const results = [
      loader.load("a", first.signal),
      loader.load("b", second.signal),
    ];
    await flushMicrotasks();
    first.abort();
    expect(calls[0]!.signal.aborted).toBe(false);
    second.abort();

    expect(calls[0]!.signal.aborted).toBe(true);
    await Promise.all(
      results.map((result) =>
        expect(result).rejects.toMatchObject({ name: "AbortError" }),
      ),
    );
  });

  test("starts a fresh request for a key whose batch was fully aborted", async () => {
    const { calls, loader } = setup();
    const controller = new AbortController();

    void loader.load("a", controller.signal).catch(() => undefined);
    await flushMicrotasks();
    controller.abort();
    const retry = loader.load("a");
    await flushMicrotasks();
    calls[1]!.resolve(upperCaseReader);

    expect(calls).toHaveLength(2);
    await expect(retry).resolves.toBe("A");
  });

  test("ignores an abort that happens after the value resolved", async () => {
    const { calls, loader } = setup();
    const controller = new AbortController();

    const result = loader.load("a", controller.signal);
    await flushMicrotasks();
    calls[0]!.resolve(upperCaseReader);
    await expect(result).resolves.toBe("A");
    controller.abort();

    expect(await settledState(result)).toBe("resolved");
  });
});
