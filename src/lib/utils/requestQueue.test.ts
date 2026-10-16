import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import {
  RequestQueue,
  bundlephobiaApiQueue,
  depsDevApiQueue,
  githubApiQueue,
  npmApiQueue,
} from "./requestQueue";

type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (error: unknown) => void;
};

const defer = <T>(): Deferred<T> => {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("RequestQueue", () => {
  test("resolves with the function result", async () => {
    const queue = new RequestQueue();

    await expect(queue.add(async () => 42)).resolves.toBe(42);
  });

  test("rejects with the original Error", async () => {
    const queue = new RequestQueue();
    const error = new Error("nope");

    await expect(
      queue.add(async () => {
        throw error;
      }),
    ).rejects.toBe(error);
  });

  test("wraps non-Error rejections in an Error", async () => {
    const queue = new RequestQueue();

    await expect(queue.add(() => Promise.reject("plain"))).rejects.toThrow(
      "plain",
    );
  });

  test("respects maxConcurrent and starts queued items after the delay", async () => {
    const queue = new RequestQueue(1, 100);
    const first = defer<string>();
    const second = defer<string>();
    const secondFn = vi.fn(() => second.promise);

    const firstResult = queue.add(() => first.promise);
    const secondResult = queue.add(secondFn);

    expect(secondFn).not.toHaveBeenCalled();

    first.resolve("a");
    await firstResult;
    expect(secondFn).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(99);
    expect(secondFn).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);
    expect(secondFn).toHaveBeenCalledTimes(1);

    second.resolve("b");
    await expect(secondResult).resolves.toBe("b");
  });

  test("runs up to maxConcurrent tasks in parallel", async () => {
    const queue = new RequestQueue(2, 10);
    const fns = [defer<number>(), defer<number>(), defer<number>()];
    const spies = fns.map((d) => vi.fn(() => d.promise));

    const results = spies.map((spy) => queue.add(spy));

    expect(spies[0]).toHaveBeenCalledTimes(1);
    expect(spies[1]).toHaveBeenCalledTimes(1);
    expect(spies[2]).not.toHaveBeenCalled();

    fns[0]!.resolve(1);
    await results[0];
    await vi.advanceTimersByTimeAsync(10);
    expect(spies[2]).toHaveBeenCalledTimes(1);

    fns[1]!.resolve(2);
    fns[2]!.resolve(3);
    await expect(Promise.all(results)).resolves.toEqual([1, 2, 3]);
  });

  test("continues processing after a failure", async () => {
    const queue = new RequestQueue(1, 10);

    const failing = queue.add(() => Promise.reject(new Error("x")));
    const ok = queue.add(async () => "ok");
    const failureAssertion = expect(failing).rejects.toThrow("x");

    await failureAssertion;
    await vi.advanceTimersByTimeAsync(10);

    await expect(ok).resolves.toBe("ok");
  });

  test("rejects an already aborted job with an AbortError without running it", async () => {
    const queue = new RequestQueue();
    const controller = new AbortController();
    controller.abort();
    const fn = vi.fn(async () => 1);

    await expect(queue.add(fn, controller.signal)).rejects.toMatchObject({
      name: "AbortError",
    });
    expect(fn).not.toHaveBeenCalled();
  });

  test("skips a queued job aborted before it starts and runs the next one", async () => {
    const queue = new RequestQueue(1, 10);
    const first = defer<string>();
    const controller = new AbortController();
    const skipped = vi.fn(async () => "skipped");
    const next = vi.fn(async () => "next");

    const firstResult = queue.add(() => first.promise);
    const skippedResult = queue.add(skipped, controller.signal);
    const nextResult = queue.add(next);
    const abortAssertion =
      expect(skippedResult).rejects.toBeInstanceOf(DOMException);

    controller.abort();
    await abortAssertion;
    first.resolve("first");
    await firstResult;
    await vi.advanceTimersByTimeAsync(10);

    await expect(nextResult).resolves.toBe("next");
    expect(skipped).not.toHaveBeenCalled();
  });

  test("does not reject a job that already started when its signal aborts", async () => {
    const queue = new RequestQueue();
    const controller = new AbortController();
    const running = defer<string>();

    const result = queue.add(() => running.promise, controller.signal);
    controller.abort();
    running.resolve("done");

    await expect(result).resolves.toBe("done");
  });
});

describe("exported queues", () => {
  test("are RequestQueue instances", () => {
    for (const queue of [
      githubApiQueue,
      npmApiQueue,
      bundlephobiaApiQueue,
      depsDevApiQueue,
    ]) {
      expect(queue).toBeInstanceOf(RequestQueue);
    }
  });
});
