import { ZodSchema } from "zod";
import safeParse from "./safeParse";

export default function getLocalStorageValue<T>(
  key: string,
  schema: ZodSchema<T>,
) {
  if (typeof window === "undefined") {
    return safeParse(null, schema);
  }
  const value = localStorage.getItem(key);
  const jsonParsed = value ? JSON.parse(value) : null;
  return safeParse(jsonParsed, schema);
}
