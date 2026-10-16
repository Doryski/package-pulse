import { describe, expect, test, vi } from "vitest";
import { createBatchLoader } from "./batchLoader";

const echoMany = (keys: string[]) =>
  Promise.resolve(new Map(keys.map((key) => [key, key.toUpperCase()])));

describe("createBatchLoader", () => {
  test("loads every expected key in one batch", async () => {
    const loadMany = vi.fn(echoMany);
    const loader = createBatchLoader(2, loadMany);

    await expect(
      Promise.all([loader.load("a"), loader.load("b")]),
    ).resolves.toEqual(["A", "B"]);
    expect(loadMany).toHaveBeenCalledExactlyOnceWith(["a", "b"]);
  });

  test("flushes once the remaining keys are released", async () => {
    const loadMany = vi.fn(echoMany);
    const loader = createBatchLoader(3, loadMany);

    const loaded = loader.load("a");
    loader.release("b");
    expect(loadMany).not.toHaveBeenCalled();
    loader.release("c");

    await expect(loaded).resolves.toBe("A");
    expect(loadMany).toHaveBeenCalledExactlyOnceWith(["a"]);
  });

  test("ignores releases of loaded keys", async () => {
    const loadMany = vi.fn(echoMany);
    const loader = createBatchLoader(2, loadMany);

    const loaded = loader.load("a");
    loader.release("a");
    expect(loadMany).not.toHaveBeenCalled();
    loader.release("b");

    await expect(loaded).resolves.toBe("A");
  });

  test("never loads when every key is released", () => {
    const loadMany = vi.fn(echoMany);
    const loader = createBatchLoader(1, loadMany);
    loader.release("a");
    expect(loadMany).not.toHaveBeenCalled();
  });

  test("loads late keys on their own", async () => {
    const loadMany = vi.fn(echoMany);
    const loader = createBatchLoader(1, loadMany);
    loader.release("a");

    await expect(loader.load("a")).resolves.toBe("A");
    expect(loadMany).toHaveBeenCalledExactlyOnceWith(["a"]);
  });

  test("rejects keys missing from the batch result", async () => {
    const loader = createBatchLoader(1, async () => new Map<string, string>());
    await expect(loader.load("a")).rejects.toThrow(
      'Batch result missing for "a"',
    );
  });

  test("rejects every waiter when the batch fails", async () => {
    const loader = createBatchLoader(2, async () => {
      throw new Error("boom");
    });
    const results = Promise.allSettled([loader.load("a"), loader.load("b")]);
    await expect(results).resolves.toEqual([
      { status: "rejected", reason: new Error("boom") },
      { status: "rejected", reason: new Error("boom") },
    ]);
  });
});
