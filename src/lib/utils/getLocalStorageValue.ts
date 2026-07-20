import { ZodSchema } from "zod";

export default function getLocalStorageValue<T>(
  key: string,
  schema: ZodSchema<T>,
) {
  if (typeof window === "undefined") {
    return schema.safeParse(null).data;
  }
  const value = localStorage.getItem(key);
  if (!value) {
    return schema.safeParse(null).data;
  }
  try {
    return schema.safeParse(JSON.parse(value)).data;
  } catch {
    return schema.safeParse(null).data;
  }
}
