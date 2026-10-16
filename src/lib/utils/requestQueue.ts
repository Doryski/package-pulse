type QueuedRequest<T> = {
  fn: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (error: Error) => void;
  signal?: AbortSignal;
  onAbort: () => void;
};

const createAbortError = () =>
  new DOMException("The operation was aborted.", "AbortError");

export class RequestQueue {
  private queue: QueuedRequest<any>[] = [];
  private running: number = 0;
  private maxConcurrent: number;
  private delay: number;

  constructor(maxConcurrent = 3, delay = 100) {
    this.maxConcurrent = maxConcurrent;
    this.delay = delay;
  }

  async add<T>(fn: () => Promise<T>, signal?: AbortSignal): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      if (signal?.aborted) {
        reject(createAbortError());
        return;
      }
      const job: QueuedRequest<T> = {
        fn,
        resolve,
        reject,
        signal,
        onAbort: () => this.cancel(job),
      };
      signal?.addEventListener("abort", job.onAbort, { once: true });
      this.queue.push(job);
      this.process();
    });
  }

  private cancel<T>(job: QueuedRequest<T>) {
    this.queue = this.queue.filter((queued) => queued !== job);
    job.reject(createAbortError());
  }

  private async process() {
    if (this.running >= this.maxConcurrent || this.queue.length === 0) {
      return;
    }

    this.running++;
    const { fn, resolve, reject, signal, onAbort } = this.queue.shift()!;
    signal?.removeEventListener("abort", onAbort);

    try {
      const result = await fn();
      resolve(result);
    } catch (error) {
      reject(error instanceof Error ? error : new Error(String(error)));
    } finally {
      this.running--;

      if (this.queue.length > 0) {
        setTimeout(() => this.process(), this.delay);
      }
    }
  }
}

export const githubApiQueue = new RequestQueue(2, 200);
export const npmApiQueue = new RequestQueue(5, 50);
export const bundlephobiaApiQueue = new RequestQueue(1, 400);
export const depsDevApiQueue = new RequestQueue(4, 100);
