export type EmptyArray = [];
export type SingleItemArray<T> = [T];
export type NonEmptyArray<T> = [T, ...T[]];

export const isEmptyArray = <T>(arr: T[]): arr is EmptyArray =>
  arr.length === 0;
export const isSingleItemArray = <T>(arr: T[]): arr is SingleItemArray<T> =>
  arr.length === 1;
export const isNonEmptyArray = <T>(arr: T[]): arr is NonEmptyArray<T> =>
  arr.length > 0;
