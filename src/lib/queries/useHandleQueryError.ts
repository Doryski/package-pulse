import { toast } from "sonner";
import { $ZodError, type $ZodIssue } from "zod/v4/core";
import getRequestErrorMessage from "../utils/getRequestErrorMessage";

const isUndefinedInputIssue = (issue: $ZodIssue | undefined) =>
  issue?.code === "invalid_type" &&
  (("input" in issue && issue.input === undefined) ||
    issue.message.endsWith("received undefined"));

const isUndefinedValueError = (error: unknown) =>
  error instanceof $ZodError && isUndefinedInputIssue(error.issues[0]);

export default function useHandleQueryError() {
  return async <T>(queryFn: () => Promise<T>, message: string): Promise<T> => {
    try {
      return await queryFn();
    } catch (error) {
      if (isUndefinedValueError(error)) {
        return Promise.reject(new Error("Received undefined value."));
      }

      toast.error(getRequestErrorMessage(error, message));
      return Promise.reject(error);
    }
  };
}
