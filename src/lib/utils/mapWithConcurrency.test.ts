import { describe, expect, test } from "vitest";
import { mapWithConcurrency } from "./mapWithConcurrency";

const deferred = () => {
  let resolve: () => void = () => undefined;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
};

describe("mapWithConcurrency", () => {
  test("keeps the input order", async () => {
    const result = await mapWithConcurrency([30, 10, 20], 2, async (ms) => {
      await new Promise((resolve) => setTimeout(resolve, ms));
      return ms * 2;
    });
    expect(result).toEqual([60, 20, 40]);
  });

  test("never runs more than the limit at once", async () => {
    const gates = [deferred(), deferred(), deferred(), deferred()];
    let active = 0;
    let peak = 0;
    const running = mapWithConcurrency(gates, 2, async (gate) => {
      active += 1;
      peak = Math.max(peak, active);
      await gate.promise;
      active -= 1;
      return active;
    });
    gates.forEach((gate) => gate.resolve());
    await running;
    expect(peak).toBe(2);
  });

  test("returns an empty list for no items", async () => {
    await expect(
      mapWithConcurrency([], 2, async (item: number) => item),
    ).resolves.toEqual([]);
  });

  test("rejects when a task fails", async () => {
    await expect(
      mapWithConcurrency([1], 2, async () => {
        throw new Error("boom");
      }),
    ).rejects.toThrow("boom");
  });
});
