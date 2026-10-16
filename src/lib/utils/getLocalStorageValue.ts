import * as z from "zod/mini";

const parseValue = <T extends z.core.$ZodType>(schema: T, value: unknown) =>
  z.safeParse(schema, value).data;

const readJson = (value: string) => {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

export default function getLocalStorageValue<T extends z.core.$ZodType>(
  key: string,
  schema: T,
) {
  if (typeof window === "undefined") return parseValue(schema, null);
  const value = localStorage.getItem(key);
  if (!value) return parseValue(schema, null);
  return parseValue(schema, readJson(value));
}
