type QueuedRequest<T> = {
  fn: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (error: Error) => void;
};

export class RequestQueue {
  private queue: QueuedRequest<any>[] = [];
  private running: number = 0;
  private maxConcurrent: number;
  private delay: number;

  constructor(maxConcurrent = 3, delay = 100) {
    this.maxConcurrent = maxConcurrent;
    this.delay = delay;
  }

  async add<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queue.push({ fn, resolve, reject });
      this.process();
    });
  }

  private async process() {
    if (this.running >= this.maxConcurrent || this.queue.length === 0) {
      return;
    }

    this.running++;
    const { fn, resolve, reject } = this.queue.shift()!;

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
