import { toast } from "sonner";
import { z } from "zod";
import getRequestErrorMessage from "../utils/getRequestErrorMessage";

const isUndefinedInputIssue = (issue: z.core.$ZodIssue | undefined) =>
  issue?.code === "invalid_type" &&
  (("input" in issue && issue.input === undefined) ||
    issue.message.endsWith("received undefined"));

const isUndefinedValueError = (error: unknown) =>
  error instanceof z.ZodError && isUndefinedInputIssue(error.issues[0]);

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
