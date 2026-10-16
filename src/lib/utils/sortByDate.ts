import { formatDate } from "@/app/(home)/utils/date-utils";

const toSortKey = (value: string | Date) =>
  typeof value === "string" ? value : formatDate(value);

const compareStrings = (a: string, b: string) => {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
};

export default function sortByDate<T>(
  data: T[],
  predicate: (item: T) => string | Date,
) {
  const keyed = data.map((item) => ({ item, key: toSortKey(predicate(item)) }));
  return keyed
    .sort((a, b) => compareStrings(a.key, b.key))
    .map(({ item }) => item);
}
