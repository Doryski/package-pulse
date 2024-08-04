import { NumericKeys } from "@/lib/types/utils/SpecificKeys";
import { capitalize } from "lodash";

export type RunUpProperty<T> = Record<
  `runUp${Capitalize<string & NumericKeys<T>>}`,
  number
>;

export type WithRunUp<T> = (T & RunUpProperty<T>)[];

export default function applyRunUpSum<T extends Record<string, any>>(
  array: T[],
  key: NumericKeys<T>,
): WithRunUp<T> {
  let sum = 0;
  return array.map((item) => {
    sum += item[key];
    return { ...item, [`runUp${capitalize(String(key))}`]: sum };
  });
}
