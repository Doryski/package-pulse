import { toast } from "sonner";
import getRequestErrorMessage from "../utils/getRequestErrorMessage";

export default function useHandleMutationError() {
  return async <T>(
    mutationFn: () => Promise<T>,
    message: string,
  ): Promise<T> => {
    try {
      return await mutationFn();
    } catch (error) {
      toast.error(getRequestErrorMessage(error, message));
      return Promise.reject(error);
    }
  };
}
