import * as Sentry from "@sentry/nextjs";
import { z } from "zod";

function reportValidationError(
  error: z.ZodError,
  data: unknown,
  schema: z.ZodTypeAny,
): void {
  // Reporting is the only part worth deferring off the hot path — the parse
  // result itself is needed synchronously (see below), so only the Sentry/
  // console I/O is fire-and-forget.
  setTimeout(() => {
    console.error(error);
    Sentry.captureException(error, {
      level: "warning",
      extra: {
        data,
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
  // Validate synchronously so schema transforms/coercions actually run and the
  // returned value matches z.output<T>. Validation here is NOT a gate: this
  // parses trusted server responses, which can't be rejected into an error —
  // on a schema mismatch we report the drift and render the raw data as-is.
  const parsed = schema.safeParse(data);
  if (parsed.success) return parsed.data;

  reportValidationError(parsed.error, data, schema);
  return data as z.output<T>;
}
