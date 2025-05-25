export type EmptyArray = [];
export type SingleItemArray<T> = [T];
export type NonEmptyArray<T> = [T, ...T[]];
export type MultiItemArray<T> = [T, ...T[]];

export const isEmptyArray = <T>(arr: T[]): arr is EmptyArray =>
  arr.length === 0;
export const isSingleItemArray = <T>(arr: T[]): arr is SingleItemArray<T> =>
  arr.length === 1;
export const isNonEmptyArray = <T>(arr: T[]): arr is NonEmptyArray<T> =>
  arr.length > 0;

export const isMultiItemArray = <T>(arr: T[]): arr is MultiItemArray<T> =>
  arr.length > 1;

export const typeArray = <T>(arr: T[]) => {
  if (isEmptyArray(arr)) {
    return arr;
  }
  if (isNonEmptyArray(arr)) {
    return arr;
  }
  throw new Error("Invalid array");
};

export const getItem = <T>(arr: T[], index: number) => {
  if (isEmptyArray(arr)) {
    return undefined;
  }
  if (isNonEmptyArray(arr)) {
    return arr.at(index);
  }
  throw new Error("Invalid array");
};
