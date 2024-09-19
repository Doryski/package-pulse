import { toast } from "sonner";
import { ZodError, ZodIssueCode } from "zod";
import getRequestErrorMessage from "../utils/getRequestErrorMessage";

export default function useHandleQueryError() {
  return async <T>(queryFn: () => Promise<T>, message: string): Promise<T> => {
    try {
      return await queryFn();
    } catch (error) {
      if (
        error instanceof ZodError &&
        error.errors[0]?.code === ZodIssueCode.invalid_type &&
        error.errors[0].received === "undefined"
      ) {
        return Promise.reject(new Error("Received undefined value."));
      }

      toast.error(getRequestErrorMessage(error, message));
      return Promise.reject(error);
    }
  };
}
