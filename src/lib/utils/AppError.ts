type AppErrorOptions = {
  status?: number;
};

export default class AppError extends Error {
  readonly status?: number;

  constructor(message: string, { status }: AppErrorOptions = {}) {
    super(message);
    this.name = "AppError";
    this.status = status;
  }
}

export const isAppError = (error: unknown): error is AppError =>
  error instanceof AppError;

export const isClientError = (error: unknown) =>
  isAppError(error) && error.status !== undefined && error.status < 500;
