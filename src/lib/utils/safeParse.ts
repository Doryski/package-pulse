import * as Sentry from "@sentry/nextjs";
import { z } from "zod";

export default function safeParse<Output, Input = Output>(
  data: unknown,
  schema: z.ZodType<Output, z.ZodTypeDef, Input>,
): Output {
  // Validate asynchronously so the caller isn't blocked by zod work on the
  // hot path. We only use the schema to surface bad payloads to logs and
  // Sentry — the data itself is returned as-is.
  setTimeout(() => {
    const parsed = schema.safeParse(data);
    if (!parsed.success) {
      const schemaName = schema.description || "Unknown schema";
      const errorPath = parsed.error.errors.map((err) => ({
        path: err.path.join("."),
        message: err.message,
        code: err.code,
      }));

      console.error(parsed.error);
      Sentry.captureException(parsed.error, {
        level: "warning",
        extra: {
          data,
          schemaName,
          errorPath,
        },
        tags: {
          errorType: "schema_validation_error",
          schemaType: schemaName,
        },
      });
    }
  }, 0);

  return data as Output;
}
