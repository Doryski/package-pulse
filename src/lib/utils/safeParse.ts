import * as Sentry from "@sentry/nextjs";
import * as z from "zod/mini";

const readSchemaName = (schema: z.core.$ZodType) =>
  z.globalRegistry.get(schema)?.description || "Unknown schema";

function reportValidationError(
  error: z.core.$ZodError,
  schema: z.core.$ZodType,
): void {
  const schemaName = readSchemaName(schema);
  setTimeout(() => {
    console.error(error);
    Sentry.captureException(error, {
      level: "warning",
      extra: {
        schemaName,
        errorPath: z.flattenError(error),
      },
      tags: {
        errorType: "schema_validation_error",
        schemaType: schemaName,
      },
    });
  }, 0);
}

export default function safeParse<T extends z.core.$ZodType>(
  data: unknown,
  schema: T,
): z.output<T> {
  const parsed = z.safeParse(schema, data);
  if (parsed.success) return parsed.data;

  reportValidationError(parsed.error, schema);
  return data as z.output<T>;
}
