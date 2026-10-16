import "server-only";
import { parseDate } from "@/app/(home)/utils/date-utils";
import { getPackageInfo } from "@/lib/server/packageInfo";
import { isValid } from "date-fns";

const ISO_DATE_LENGTH = 10;

const toPublishDay = (createdAt: string | null | undefined) => {
  if (!createdAt) return undefined;
  const day = parseDate(createdAt.slice(0, ISO_DATE_LENGTH));
  return isValid(day) ? day : undefined;
};

const whenAborted = (signal: AbortSignal) =>
  new Promise<undefined>((resolve) => {
    if (signal.aborted) resolve(undefined);
    signal.addEventListener("abort", () => resolve(undefined), { once: true });
  });

const readFirstPublished = (name: string) =>
  getPackageInfo(name).then(
    (info) => toPublishDay(info?.createdAt),
    () => undefined,
  );

export default async function getFirstPublished(
  packages: string[],
  signal: AbortSignal,
) {
  const aborted = whenAborted(signal);
  const days = await Promise.all(
    packages.map((name) => Promise.race([readFirstPublished(name), aborted])),
  );
  return Object.fromEntries(
    packages.flatMap((name, index) => {
      const day = days[index];
      return day ? [[name, day] as const] : [];
    }),
  );
}
