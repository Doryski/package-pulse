import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

const noop = () => {};

const createMediaQueryList = (query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  addListener: vi.fn(),
  removeListener: vi.fn(),
  dispatchEvent: vi.fn(() => false),
});

const definePolyfill = (target: object, key: string, value: unknown) => {
  if (key in target && Reflect.get(target, key) !== undefined) return;
  Object.defineProperty(target, key, {
    writable: true,
    configurable: true,
    value,
  });
};

const installDomPolyfills = () => {
  definePolyfill(globalThis, "ResizeObserver", ResizeObserverStub);
  definePolyfill(window, "matchMedia", createMediaQueryList);
  definePolyfill(window, "scrollTo", noop);
  definePolyfill(Element.prototype, "scrollIntoView", noop);
  definePolyfill(Element.prototype, "hasPointerCapture", () => false);
  definePolyfill(Element.prototype, "setPointerCapture", noop);
  definePolyfill(Element.prototype, "releasePointerCapture", noop);
};

if (typeof window !== "undefined") installDomPolyfills();

afterEach(() => {
  cleanup();
});
