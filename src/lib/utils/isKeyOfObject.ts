export default function isKeyOfObject<T extends Record<PropertyKey, unknown>>(
  value: unknown,
  object: T,
): value is keyof T {
  return (
    (typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "symbol") &&
    Object.hasOwn(object, value)
  );
}
