import { z } from "zod";
import { captureExceptionWithSearchParams } from "./sentry-context";

export default function safeParse<Output, Input = Output>(
  data: unknown,
  schema: z.ZodType<Output, z.ZodTypeDef, Input>,
): Output {
  const parsed = schema.safeParse(data);
  if (!parsed.success) {
    console.error(parsed.error);
    captureExceptionWithSearchParams(parsed.error, {
      level: "warning",
      extra: {
        data,
        schemaName: schema.description || "Unknown schema",
        errorPath: parsed.error.errors.map((err) => ({
          path: err.path.map((p) => `"${p}"`).join("."),
          message: err.message,
          code: err.code,
        })),
      },
      tags: {
        errorType: "schema_validation_error",
        schemaType: schema.description || "Unknown schema",
      },
    });

    return data as Output;
  }
  return parsed.data;
}
