export type SpecificKeys<TObject, Specific> = {
  [Key in keyof TObject]: TObject[Key] extends Specific ? Key : never;
}[keyof TObject];

export type NumericKeys<T> = SpecificKeys<T, number>;
export type StringKeys<T> = SpecificKeys<T, string>;
export type DateKeys<T> = SpecificKeys<T, Date>;
