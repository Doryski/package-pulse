import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import getLocalStorageValue from "./getLocalStorageValue";

describe("getLocalStorageValue", () => {
  const mockLocalStorage = {
    getItem: vi.fn(),
  };

  beforeEach(() => {
    vi.stubGlobal("localStorage", mockLocalStorage);
    vi.stubGlobal("window", {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("should return undefined when window is undefined", () => {
    vi.stubGlobal("window", undefined);
    const schema = z.string();
    const result = getLocalStorageValue("testKey", schema);
    expect(result).toBeUndefined();
  });

  it("should return parsed value when localStorage has a valid value", () => {
    const schema = z.string();
    mockLocalStorage.getItem.mockReturnValue('"testValue"');
    const result = getLocalStorageValue("testKey", schema);
    expect(result).toBe("testValue");
    expect(mockLocalStorage.getItem).toHaveBeenCalledWith("testKey");
  });

  it("should return undefined when localStorage has no value", () => {
    const schema = z.string();
    mockLocalStorage.getItem.mockReturnValue(null);
    const result = getLocalStorageValue("testKey", schema);
    expect(result).toBeUndefined();
    expect(mockLocalStorage.getItem).toHaveBeenCalledWith("testKey");
  });

  it("should return undefined when localStorage value is invalid according to schema", () => {
    const schema = z.number();
    mockLocalStorage.getItem.mockReturnValue('"notANumber"');
    const result = getLocalStorageValue("testKey", schema);
    expect(result).toBeUndefined();
    expect(mockLocalStorage.getItem).toHaveBeenCalledWith("testKey");
  });

  it("should handle complex object schemas", () => {
    const schema = z.object({
      name: z.string(),
      age: z.number(),
    });
    const input = { name: "John", age: 30 };
    mockLocalStorage.getItem.mockReturnValue(JSON.stringify(input));
    const result = getLocalStorageValue("testKey", schema);
    expect(result).toEqual(input);
    expect(mockLocalStorage.getItem).toHaveBeenCalledWith("testKey");
  });
});
