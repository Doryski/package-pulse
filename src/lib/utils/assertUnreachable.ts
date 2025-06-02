import AppError from "./AppError";

export default function assertUnreachable(_x: never, message: string) {
  throw new AppError(message);
}
