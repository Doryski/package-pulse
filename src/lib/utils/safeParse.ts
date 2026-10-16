import * as Sentry from "@sentry/nextjs";
import { z } from "zod";

function reportValidationError(error: z.ZodError, schema: z.ZodTypeAny): void {
  setTimeout(() => {
    console.error(error);
    Sentry.captureException(error, {
      level: "warning",
      extra: {
        schemaName: schema.description || "Unknown schema",
        errorPath: error.flatten(),
      },
      tags: {
        errorType: "schema_validation_error",
        schemaType: schema.description || "Unknown schema",
      },
    });
  }, 0);
}

export default function safeParse<T extends z.ZodTypeAny>(
  data: unknown,
  schema: T,
): z.output<T> {
  const parsed = schema.safeParse(data);
  if (parsed.success) return parsed.data;

  reportValidationError(parsed.error, schema);
  return data as z.output<T>;
}
