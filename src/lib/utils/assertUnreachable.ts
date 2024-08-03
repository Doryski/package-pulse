export default function assertUnreachable(_x: never, message: string) {
  throw new Error(message);
}
