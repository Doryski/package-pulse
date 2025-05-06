import { ZodSchema } from "zod";

export default function getLocalStorageValue<T>(
  key: string,
  schema: ZodSchema<T>,
) {
  if (typeof window === "undefined") {
    return schema.safeParse(null).data;
  }
  const value = localStorage.getItem(key);
  const jsonParsed = value ? JSON.parse(value) : null;
  return schema.safeParse(jsonParsed).data;
}
