import { isError } from "lodash";
import { ZodError } from "zod";
import { isAppError } from "./AppError";

export default function getRequestErrorMessage(
  error: unknown,
  defaultMessage: string,
): string {
  if (process.env.NODE_ENV === "development") {
    console.error(error);
  }

  if (isAppError(error)) return error.message;

  if (error instanceof ZodError) return defaultMessage;
  if (error instanceof TypeError) return defaultMessage;
  if (isError(error)) return error.message;
  return defaultMessage;
}
